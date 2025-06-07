const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');

const extractTable = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  
  // Split text by line and filter lines containing multiple spaces or tabs (table-like lines)
  const lines = data.text.split('\n').filter(line => line.trim().length > 0 && line.match(/\t|\s{2,}/));
  if (lines.length < 2) throw new Error("No table-like data found");

  // Use flexible split by one or more whitespace characters
  const rows = lines.map(line => line.trim().split(/\t|\s{2,}/));

  const headers = rows[0];
  // Filter out any rows that don't have the same number of columns as headers
  const values = rows.slice(1).filter(row => row.length === headers.length)
    .map(row => row.map(value => {
      const trimmed = value.trim();
      // Convert to number if valid number string, else keep as string
      return !isNaN(trimmed) && trimmed !== '' ? Number(trimmed) : trimmed;
    }));

  return { headers, values };
};

const generateHTML = (headers, values) => {
  const tableRows = values.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('');
  const tableHeader = `<tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>`;

  return `
    <html>
      <head>
        <title>Dashboard</title>
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
          th { background-color: #eee; }
        </style>
      </head>
      <body>
        <h1>📊 PDF Table Dashboard</h1>
        <table>${tableHeader}${tableRows}</table>
      </body>
    </html>
  `;
};

const saveHTMLToFile = async (htmlContent, filename) => {
  const dashboardDir = path.join(__dirname, '../dashboards');
  await fs.mkdir(dashboardDir, { recursive: true });
  const outputPath = path.join(dashboardDir, `${filename}.html`);
  await fs.writeFile(outputPath, htmlContent);
  return outputPath;
};

module.exports = async function pdfTableToHTMLDashboard(filePath) {
  const { headers, values } = await extractTable(filePath);
  const html = generateHTML(headers, values);
  const htmlFile = await saveHTMLToFile(html, path.basename(filePath, '.pdf'));
  return htmlFile;
};
