const express = require('express');
const multer = require('multer');
const Groq = require('groq-sdk');
const { protect } = require('../middleware/authMiddleware');
const getSupabase = require('../config/supabase');

const router = express.Router();

// Multer: store audio in memory (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Lazy-init Groq client
let groqClient = null;
function getGroq() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

// ── Build LLM system prompt based on page type ──
function buildSystemPrompt(pageType, context) {
  const base = `You are an expense tracker voice assistant. Parse the user's spoken command into structured JSON actions.
Always respond with valid JSON only: { "actions": [ ...action objects... ] }
If multiple actions are spoken, return all of them. Never add explanation text outside the JSON.`;

  if (pageType === 'record') {
    const expenseList = (context.expenses || [])
      .slice(0, 20)
      .map(e => `  - name:"${e.name}", amount:${e.amount}`)
      .join('\n');
    const incomeList = (context.incomes || [])
      .slice(0, 10)
      .map(i => `  - source:"${i.source}", amount:${i.amount}`)
      .join('\n');

    return `${base}

PAGE: Monthly Record for ${context.month_name || ''} ${context.year || ''}
Record ID: ${context.recordId || ''}

CURRENT EXPENSES:
${expenseList || '  (none)'}

CURRENT INCOMES:
${incomeList || '  (none)'}

ACTION TYPES:
1. ADD_EXPENSE — add a new expense to this record
   { "type": "ADD_EXPENSE", "name": "<expense name>", "amount": <number in rupees>, "description": "Added expense <name> ₹<amount>" }

2. DELETE_EXPENSE — remove an expense by name (fuzzy match)
   { "type": "DELETE_EXPENSE", "name": "<expense name to delete>", "description": "Deleted expense <name>" }

3. ADD_INCOME — add a new income source
   { "type": "ADD_INCOME", "source": "<source name>", "amount": <number>, "description": "Added income from <source> ₹<amount>" }

4. DELETE_INCOME — remove an income source by name
   { "type": "DELETE_INCOME", "source": "<source name>", "description": "Deleted income source <source>" }

5. UPDATE_SAVINGS_GOAL — update the savings goal
   { "type": "UPDATE_SAVINGS_GOAL", "amount": <number>, "description": "Updated savings goal to ₹<amount>" }

6. ASK_QUESTION — user is asking a question about this record's data
   { "type": "ASK_QUESTION", "question": "<the user's question>", "description": "Answering question" }

7. UNKNOWN — cannot match any action
   { "type": "UNKNOWN", "description": "<brief reason>" }

RULES:
- Match expense/income names fuzzily (e.g. "food" matches "groceries", "rice", "food items")
- Amounts in rupees; convert if user says "lakhs" (1 lakh = 100000)
- If user says "delete rent" or "remove food expense" → DELETE_EXPENSE
- If user asks a question like "what is my biggest expense?" → ASK_QUESTION
- Be generous in interpretation`;
  }

  if (pageType === 'budget') {
    const categoryList = (context.categories || [])
      .slice(0, 20)
      .map(c => `  - category:"${c.category}", allocated:${c.allocated_amount}`)
      .join('\n');

    return `${base}

PAGE: Budget for ${context.month_name || ''} ${context.year || ''}
Month: ${context.month || ''}, Year: ${context.year || ''}

CURRENT BUDGET CATEGORIES:
${categoryList || '  (none)'}

ACTION TYPES:
1. ADD_BUDGET_CATEGORY — add a new budget category
   { "type": "ADD_BUDGET_CATEGORY", "category": "<category name>", "amount": <number in rupees>, "description": "Added budget for <category> ₹<amount>" }

2. UPDATE_BUDGET_CATEGORY — update an existing category's allocation (fuzzy match name)
   { "type": "UPDATE_BUDGET_CATEGORY", "category": "<category name>", "amount": <new number>, "description": "Updated <category> budget to ₹<amount>" }

3. DELETE_BUDGET_CATEGORY — delete a budget category (fuzzy match name)
   { "type": "DELETE_BUDGET_CATEGORY", "category": "<category name>", "description": "Deleted budget for <category>" }

4. ASK_QUESTION — user is asking about budget data
   { "type": "ASK_QUESTION", "question": "<user question>", "description": "Answering question" }

5. UNKNOWN
   { "type": "UNKNOWN", "description": "<reason>" }

RULES:
- Match category names fuzzily (e.g. "food" matches "groceries", "dining", "food & drinks")
- Return all actions if multiple are mentioned in one command`;
  }

  if (pageType === 'notes') {
    const entryList = (context.note_entries || [])
      .slice(0, 20)
      .map((e, i) => `  - index:${i}, type:"${e.type}", title:"${e.title}"${e.person_name ? `, person:"${e.person_name}"` : ''}${e.amount ? `, amount:${e.amount}` : ''}`)
      .join('\n');

    return `${base}

PAGE: Notes for ${context.month_name || ''} ${context.year || ''}
Notes Record ID: ${context.noteId || context.notesId || ''}

CURRENT NOTE ENTRIES:
${entryList || '  (none)'}

ACTION TYPES:
1. ADD_LENDING_NOTE — add a lending tracker entry
   { "type": "ADD_LENDING_NOTE", "title": "<title>", "description": "<description or details>", "personName": "<person name>", "amount": <number>, "description": "Added lending note for <person> ₹<amount>" }

2. ADD_PERSONAL_NOTE — add a general/personal note
   { "type": "ADD_PERSONAL_NOTE", "title": "<title>", "description_text": "<note content>", "description": "Added personal note: <title>" }

3. DELETE_NOTE_ENTRY — remove a note entry by title or person name (fuzzy match)
   { "type": "DELETE_NOTE_ENTRY", "title": "<title or person name to delete>", "description": "Deleted note: <title>" }

4. ASK_QUESTION — user is asking about notes/lending data
   { "type": "ASK_QUESTION", "question": "<user question>", "description": "Answering question" }

5. UNKNOWN
   { "type": "UNKNOWN", "description": "<reason>" }

RULES:
- For lending: always capture person name and amount
- Description field in note entries is the content/body, the "description" at root level is the action summary
- Match note titles/person names fuzzily`;
  }

  if (pageType === 'chat') {
    return `${base}

PAGE: AI Chat
Return only a TRANSCRIBE_ONLY action with the exact transcript text.

ACTION TYPES:
1. TRANSCRIBE_ONLY
   { "type": "TRANSCRIBE_ONLY", "text": "<exact transcript>", "description": "Voice to text" }`;
  }

  return base;
}

// ── Build answer prompt for ASK_QUESTION actions ──
function buildAnswerPrompt(pageType, context, question) {
  let contextStr = '';

  if (pageType === 'record') {
    const totalIncome = (context.incomes || []).reduce((s, i) => s + Number(i.amount), 0);
    const totalExpense = (context.expenses || []).reduce((s, e) => s + Number(e.amount), 0);
    contextStr = `
Month: ${context.month_name} ${context.year}
Total Income: ₹${totalIncome.toLocaleString('en-IN')}
Total Expenses: ₹${totalExpense.toLocaleString('en-IN')}
Net Surplus: ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}
Savings Goal: ₹${Number(context.savings_goal || 0).toLocaleString('en-IN')}

Income Sources:
${(context.incomes || []).map(i => `  - ${i.source}: ₹${Number(i.amount).toLocaleString('en-IN')}`).join('\n') || '  (none)'}

Expenses:
${(context.expenses || []).map(e => `  - ${e.name}: ₹${Number(e.amount).toLocaleString('en-IN')}`).join('\n') || '  (none)'}`;
  } else if (pageType === 'budget') {
    contextStr = `
Month: ${context.month_name} ${context.year}
Budget Categories:
${(context.categories || []).map(c => `  - ${c.category}: Budget ₹${Number(c.allocated_amount).toLocaleString('en-IN')}, Actual ₹${Number(c.actual_amount || 0).toLocaleString('en-IN')}, Diff: ₹${Number(c.difference || 0).toLocaleString('en-IN')}`).join('\n') || '  (none)'}`;
  } else if (pageType === 'notes') {
    contextStr = `
Month: ${context.month_name} ${context.year}
Notes:
${(context.note_entries || []).map(e => `  - [${e.type}] ${e.title}${e.person_name ? ` (to: ${e.person_name})` : ''}${e.amount ? ` ₹${Number(e.amount).toLocaleString('en-IN')}` : ''}: ${e.description || ''}`).join('\n') || '  (none)'}`;
  }

  return `You are a financial assistant. Answer the user's question concisely using ONLY the data provided below. Use Indian currency format (₹). Be brief and direct (2-3 sentences max).

DATA:${contextStr}

Question: ${question}`;
}

// ─── Execute CRUD actions server-side ───
async function executeActions(actions, pageType, context, userId) {
  const results = [];
  const supabase = getSupabase();

  for (const action of actions) {
    try {
      if (action.type === 'ADD_EXPENSE' && pageType === 'record') {
        const { error } = await supabase.from('expenses').insert({
          record_id: context.recordId,
          name: (action.name || '').toLowerCase().trim(),
          amount: Number(action.amount) || 0,
        });
        if (error) throw error;
        results.push({ type: action.type, success: true, message: action.description || `Added expense ${action.name}` });

      } else if (action.type === 'DELETE_EXPENSE' && pageType === 'record') {
        // Fuzzy match existing expenses
        const expenses = context.expenses || [];
        const target = action.name.toLowerCase().trim();
        const match = expenses.find(e =>
          e.name.toLowerCase().includes(target) || target.includes(e.name.toLowerCase())
        );
        if (!match) {
          results.push({ type: action.type, success: false, message: `Expense "${action.name}" not found` });
          continue;
        }
        const { error } = await supabase.from('expenses').delete().eq('id', match.id);
        if (error) throw error;
        results.push({ type: action.type, success: true, message: `Deleted expense: ${match.name}` });

      } else if (action.type === 'ADD_INCOME' && pageType === 'record') {
        const { error } = await supabase.from('incomes').insert({
          record_id: context.recordId,
          source: (action.source || '').trim(),
          amount: Number(action.amount) || 0,
        });
        if (error) throw error;
        results.push({ type: action.type, success: true, message: action.description || `Added income from ${action.source}` });

      } else if (action.type === 'DELETE_INCOME' && pageType === 'record') {
        const incomes = context.incomes || [];
        const target = action.source.toLowerCase().trim();
        const match = incomes.find(i =>
          i.source.toLowerCase().includes(target) || target.includes(i.source.toLowerCase())
        );
        if (!match) {
          results.push({ type: action.type, success: false, message: `Income source "${action.source}" not found` });
          continue;
        }
        const { error } = await supabase.from('incomes').delete().eq('id', match.id);
        if (error) throw error;
        results.push({ type: action.type, success: true, message: `Deleted income: ${match.source}` });

      } else if (action.type === 'UPDATE_SAVINGS_GOAL' && pageType === 'record') {
        const { error } = await supabase
          .from('monthly_records')
          .update({ savings_goal: Number(action.amount) || 0 })
          .eq('id', context.recordId)
          .eq('user_id', userId);
        if (error) throw error;
        results.push({ type: action.type, success: true, message: action.description || `Updated savings goal to ₹${action.amount}` });

      } else if (action.type === 'ADD_BUDGET_CATEGORY' && pageType === 'budget') {
        const { error } = await supabase.from('budget_allocations').upsert({
          user_id: userId,
          month: Number(context.month),
          year: Number(context.year),
          category: (action.category || '').trim(),
          allocated_amount: Number(action.amount) || 0,
        }, { onConflict: 'user_id,month,year,category' });
        if (error) throw error;
        results.push({ type: action.type, success: true, message: action.description || `Added budget for ${action.category}` });

      } else if (action.type === 'UPDATE_BUDGET_CATEGORY' && pageType === 'budget') {
        // Fuzzy match existing categories
        const categories = context.categories || [];
        const target = action.category.toLowerCase().trim();
        const match = categories.find(c =>
          c.category.toLowerCase().includes(target) || target.includes(c.category.toLowerCase())
        );
        const categoryName = match ? match.category : action.category;
        const { error } = await supabase.from('budget_allocations').upsert({
          user_id: userId,
          month: Number(context.month),
          year: Number(context.year),
          category: categoryName,
          allocated_amount: Number(action.amount) || 0,
        }, { onConflict: 'user_id,month,year,category' });
        if (error) throw error;
        results.push({ type: action.type, success: true, message: action.description || `Updated ${categoryName} budget` });

      } else if (action.type === 'DELETE_BUDGET_CATEGORY' && pageType === 'budget') {
        const categories = context.categories || [];
        const target = action.category.toLowerCase().trim();
        const match = categories.find(c =>
          c.category.toLowerCase().includes(target) || target.includes(c.category.toLowerCase())
        );
        if (!match || !match.id) {
          results.push({ type: action.type, success: false, message: `Budget category "${action.category}" not found` });
          continue;
        }
        const { error } = await supabase.from('budget_allocations').delete().eq('id', match.id);
        if (error) throw error;
        results.push({ type: action.type, success: true, message: `Deleted budget: ${match.category}` });

      } else if (action.type === 'ADD_LENDING_NOTE' && pageType === 'notes') {
        const { error } = await supabase.from('note_entries').insert({
          notes_id: context.noteId || context.notesId,
          title: (action.title || '').trim(),
          description: (action.description_text || action.description || '').trim(),
          type: 'lending',
          person_name: (action.personName || '').trim() || null,
          amount: Number(action.amount) || null,
        });
        if (error) throw error;
        results.push({ type: action.type, success: true, message: `Added lending note for ${action.personName}` });

      } else if (action.type === 'ADD_PERSONAL_NOTE' && pageType === 'notes') {
        const { error } = await supabase.from('note_entries').insert({
          notes_id: context.noteId || context.notesId,
          title: (action.title || '').trim(),
          description: (action.description_text || '').trim(),
          type: 'general',
          person_name: null,
          amount: null,
        });
        if (error) throw error;
        results.push({ type: action.type, success: true, message: `Added personal note: ${action.title}` });

      } else if (action.type === 'DELETE_NOTE_ENTRY' && pageType === 'notes') {
        const entries = context.note_entries || [];
        const target = (action.title || '').toLowerCase().trim();
        const match = entries.find(e =>
          e.title.toLowerCase().includes(target) ||
          target.includes(e.title.toLowerCase()) ||
          (e.person_name && (e.person_name.toLowerCase().includes(target) || target.includes(e.person_name.toLowerCase())))
        );
        if (!match) {
          results.push({ type: action.type, success: false, message: `Note "${action.title}" not found` });
          continue;
        }
        const { error } = await supabase.from('note_entries').delete().eq('id', match.id);
        if (error) throw error;
        results.push({ type: action.type, success: true, message: `Deleted note: ${match.title}` });

      } else if (action.type === 'ASK_QUESTION') {
        // Answer using LLM
        const groq = getGroq();
        const answerPrompt = buildAnswerPrompt(pageType, context, action.question);
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: answerPrompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_tokens: 256,
        });
        const answer = completion.choices[0]?.message?.content || 'Unable to answer.';
        results.push({ type: action.type, success: true, message: answer, isAnswer: true });

      } else if (action.type === 'TRANSCRIBE_ONLY') {
        results.push({ type: action.type, success: true, message: action.text || '', isTranscript: true });

      } else if (action.type === 'UNKNOWN') {
        results.push({ type: action.type, success: false, message: action.description || 'Command not understood' });

      } else {
        results.push({ type: action.type, success: false, message: 'Action not supported on this page' });
      }
    } catch (err) {
      console.error(`Voice action error (${action.type}):`, err?.message || err);
      results.push({ type: action.type, success: false, message: err?.message || 'Action failed' });
    }
  }

  return results;
}

// ── POST /api/voice/process ──
router.post('/process', protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ message: 'Groq API key not configured' });
    }

    const groq = getGroq();

    // Parse pageType and context from the request body
    const pageType = req.body.pageType || 'record';
    let context = {};
    try {
      context = JSON.parse(req.body.context || '{}');
    } catch {
      context = {};
    }

    // ── Step 1: Whisper transcription ──
    const audioFile = new File(
      [req.file.buffer],
      req.file.originalname || 'audio.webm',
      { type: req.file.mimetype || 'audio/webm' }
    );

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'verbose_json',
    });

    const transcript = (transcription.text || '').trim();

    if (!transcript) {
      return res.json({
        transcript: '',
        actions: [{ type: 'UNKNOWN', success: false, message: 'No speech detected' }],
      });
    }

    // ── Step 2: LLM command parsing ──
    const systemPrompt = buildSystemPrompt(pageType, context);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    });

    let parsedActions = [{ type: 'UNKNOWN', description: 'Could not parse command' }];
    try {
      const content = chatCompletion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
          parsedActions = parsed.actions;
        } else if (parsed.type) {
          parsedActions = [parsed];
        }
      }
    } catch {
      // Fall through with UNKNOWN
    }

    // ── Step 3: Execute CRUD actions server-side ──
    const userId = req.user.id;
    const executedResults = await executeActions(parsedActions, pageType, context, userId);

    res.json({ transcript, actions: executedResults });

  } catch (err) {
    console.error('Voice process error:', err?.message || err);

    if (err?.status === 413 || err?.message?.includes('too large')) {
      return res.status(413).json({ message: 'Audio too large. Keep recordings under 25 seconds.' });
    }
    if (err?.status === 429) {
      return res.status(429).json({ message: 'Rate limited. Please wait a moment and try again.' });
    }

    res.status(500).json({ message: 'Voice processing failed. Please try again.' });
  }
});

module.exports = router;
