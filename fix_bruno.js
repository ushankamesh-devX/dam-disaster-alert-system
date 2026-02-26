const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'api', 'bruno', 'news');
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (!file.endsWith('.bru')) return;
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove any vars:pre-request blocks that might be wrongly set
    content = content.replace(/vars:pre-request\s*\{[\s\S]*?\}/g, '');

    // Fixing the URL to exactly match the working pattern (e.g. {{base_url}}/news-categories)
    content = content.replace(/url:\s*\{\{baseUrl\}\}\/api\/v1\//g, 'url: {{base_url}}/');
    content = content.replace(/url:\s*\{\{baseUrl\}\}\/api\//g, 'url: {{base_url}}/');
    content = content.replace(/url:\s*\{\{baseUrl\}\}\//g, 'url: {{base_url}}/');
    content = content.replace(/url:\s*\{\{base_url\}\}\/api\/v1\//g, 'url: {{base_url}}/');
    content = content.replace(/url:\s*\{\{base_url\}\}\/api\//g, 'url: {{base_url}}/');

    // If we already have auth: bearer we don't want to double add it. 
    // Let's replace auth: inherit with auth: bearer and the auth token block.
    content = content.replace(/auth:\s*inherit\s*\}/g, 'auth: bearer\n}\n\nauth:bearer {\n  token: {{auth_token}}\n}');

    // Clean up any double blank lines
    content = content.replace(/\n{3,}/g, '\n\n');

    fs.writeFileSync(filePath, content.trim() + '\n');
});

console.log("Bruno files updated successfully.");
