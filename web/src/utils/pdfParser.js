import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

/**
 * Extracts plain text from an uploaded PDF file in the browser.
 * @param {File} file
 * @returns {Promise<{ text: string, pageCount: number, wordCount: number }>}
 */
export async function extractTextFromPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pageTexts = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .filter(Boolean)
            .join(' ');
        if (pageText.trim()) {
            pageTexts.push(`--- Page ${pageNum} ---\n${pageText.trim()}`);
        }
    }

    const fullText = pageTexts.join('\n\n');
    const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;

    return {
        text: fullText,
        pageCount: pdf.numPages,
        wordCount,
    };
}

