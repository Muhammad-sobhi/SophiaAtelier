const fs = require('fs');
const path = require('path');

function cleanTS(dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      cleanTS(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let code = fs.readFileSync(fullPath, 'utf8');

      // Remove React component props type annotations like ({ children }: { children: React.ReactNode })
      code = code.replace(/(\{[\s\S]*?\})\s*:\s*\{[\s\S]*?\}/g, '$1');

      // Remove useState generic types like useState<Employee | null>(null) -> useState(null)
      code = code.replace(/useState<[^>]+>\((.*?)\)/g, 'useState($1)');
      code = code.replace(/useRef<[^>]+>\((.*?)\)/g, 'useRef($1)');

      // Remove api client generic types like apiClient.post<{ user: any; token: string }>
      code = code.replace(/apiClient\.(get|post|put|delete)<[^>]+>\(/g, 'apiClient.$1(');

      // Remove any lingering type casts like as string, as any
      code = code.replace(/\s+as\s+[A-Za-z0-9_<>|\[\]]+/g, '');

      // Remove interface and type keywords if any left
      code = code.replace(/^export\s+interface\s+\w+[\s\S]*?^\}/gm, '');
      code = code.replace(/^interface\s+\w+[\s\S]*?^\}/gm, '');

      fs.writeFileSync(fullPath, code);
      console.log(`Cleaned TS from ${fullPath}`);
    }
  });
}

cleanTS('d:/Atelier Sophia/dashboard/src');
