const fs = require('fs');

function transformFile(srcPath, destPath) {
  let code = fs.readFileSync(srcPath, 'utf8');

  // Strip 'use client'
  code = code.replace(/['"]use client['"][\s;]*/g, '');

  // Replace Next.js router imports with React Router
  code = code.replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]next\/navigation['"];?/g, (match, importsStr) => {
    const parts = importsStr.split(',').map(s => s.trim());
    const mapped = parts.map(p => {
      if (p === 'useRouter') return 'useNavigate';
      if (p === 'usePathname') return 'useLocation';
      if (p === 'useSearchParams') return 'useSearchParams';
      return p;
    });
    return `import { ${mapped.join(', ')} } from 'react-router-dom';`;
  });

  // Replace next/link
  code = code.replace(/import\s+Link\s+from\s+['"]next\/link['"];?/g, "import { Link } from 'react-router-dom';");

  // Replace next/image
  code = code.replace(/import\s+Image\s+from\s+['"]next\/image['"];?/g, '');

  // Strip type annotations & interfaces
  code = code.replace(/interface\s+\w+(\s*<[^>]+>)?\s*\{[\s\S]*?\n\}/g, '');
  code = code.replace(/type\s+\w+(\s*<[^>]+>)?\s*=[\s\S]*?;/g, '');

  // Strip type parameters from hooks / function calls
  code = code.replace(/<[A-Z]\w*(\[\])?(\s*\|\s*null|\s*\|\s*undefined)?>/g, '');
  code = code.replace(/<Record<[^>]+>>/g, '');

  // Replace process.env.NEXT_PUBLIC_ -> import.meta.env.VITE_
  code = code.replace(/process\.env\.NEXT_PUBLIC_/g, 'import.meta.env.VITE_');

  // Replace router.push -> navigate
  code = code.replace(/\brouter\.push\b/g, 'navigate');
  code = code.replace(/\brouter\.replace\b/g, 'navigate');
  code = code.replace(/const router = useRouter\(\);/g, 'const navigate = useNavigate();');

  // Replace href= in Link with to=
  // (Handling basic Link usage)
  
  fs.writeFileSync(destPath, code);
  console.log(`Transformed ${srcPath} -> ${destPath}`);
}

module.exports = { transformFile };
