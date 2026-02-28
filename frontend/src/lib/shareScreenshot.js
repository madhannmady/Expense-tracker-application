import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export const captureAndShareScreenshot = async (elementId, filename = 'expense-tracker.png') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Content element not found');
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Capturing screenshot...');

    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      try {
        // Try using Web Share API if available
        if (navigator.share) {
          const file = new File([blob], filename, { type: 'image/png' });
          await navigator.share({
            files: [file],
            title: 'My Expense Report',
            text: 'Check out my monthly expense report',
          });
          toast.dismiss(loadingToast);
          toast.success('Screenshot shared successfully!');
        } else {
          // Fallback: Download the image
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast.dismiss(loadingToast);
          toast.success('Screenshot downloaded! You can now share it.');
        }
      } catch (error) {
        toast.dismiss(loadingToast);
        if (error.name !== 'AbortError') {
          toast.error('Failed to share screenshot');
          console.error('Share error:', error);
        }
      }
    }, 'image/png');
  } catch (error) {
    toast.error('Failed to capture screenshot');
    console.error('Capture error:', error);
  }
};
