//Option Variables
//Base URL for importing modules from CDN
const CDNBase = 'https://jspm.dev/';
//CDN URL for Bootstrap CSS Library
const BootstrapCSSURL = 'https://unpkg.com/bootstrap/dist/css/bootstrap.min.css';
//CDN URL for Babel Standalone Library
const BabelURL = 'https://unpkg.com/@babel/standalone/babel.min.js';
//Babel Standalone Option
const BabelPreset = 'typescript';
const BabelOption = { allExtensions: true, isTSX: true };

//Get Redirect Limit
const RedirectLimit = 20;

//Trasnpile file suffix
const TranspileSuffix = '.lib.js';

//HTTP Server Port Number
const DefaultPort = 8080;
//HTTP Server Shutdown Time (ms)
const DefaultShutdownTime = 30 * 1000;

const replaceImport = (script) => {
  const importRegex = /(import[ \t]+?)([^'"]*?)([ \t]+from[ \t]+)?(['"])([^'"]*)(['"];?)/g;
  let result = script.replace(importRegex, (match, importStr, varStr, fromStr, quoteL, modName, quoteR) => {
    if ((modName.startsWith('/') || modName.startsWith('./') || modName.startsWith('../')) && !modName.endsWith('.js')) {
      modName = modName + TranspileSuffix;
    }
    if (!modName.startsWith('/')  && !modName.startsWith('./') && !modName.startsWith('../') && !modName.startsWith('http://') && !modName.startsWith('https://')) {
      modName = CDNBase + modName;
    }
    return importStr + varStr + fromStr + quoteL + modName + quoteR;
  });
  return result;
}

const transpile = (Babel, script) => {
  //Setting Babel
  Babel.registerPreset('tsx', {
    presets: [
      [Babel.availablePresets[BabelPreset], BabelOption]
    ],
  });

  let result = Babel.transform(script, { presets: ['tsx', 'react'] }).code;

  return result;
}

//Determining if it is a Node.js environment
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null && process.release.name === 'node';

if (!isNode) {
  //Browser environment
  (async function () {
    //Import javascript file function
    const importScript = async (src) => {
      const element = document.createElement('script');
      element.type = 'text/javascript';
      element.src = src;
      const promise = new Promise((resolve, reject) => {
        element.addEventListener('load', () => {
          resolve();
        })
        element.addEventListener('error', () => {
          reject(new Error(`Failed to load script: ${src}`));
        });
      });
      document.getElementById('_reactscript').appendChild(element);
      return promise;
    };

    //Show error message
    const showErrorMessage = (message) => {
      console.log('There was a problem: ' + message);
      let loadinghtml = document.getElementById('loading');
      loadinghtml.innerHTML = '<span style="color:red;">Error! ' + message + '</span>';
    };

    try {
      //Load and Setting Babel
      await importScript(BabelURL);

      //Load [HTML file name].tsx file
      let htmlName = window.location.pathname.split('/').pop().replace(/\.html?$/i, '');
      let fetchResponse;
      fetchResponse = await fetch(htmlName + '.tsx');
      if (!fetchResponse.ok) {
        throw new Error(`HTTP Error: ${fetchResponse.status} ${htmlName}.tsx`);
      }
      let tsxContents = await fetchResponse.text();

      //Convert to CDN URL if not a direct URL specification and not a relative path
      let appScript = replaceImport(tsxContents);

      //Building Script
      let buildScript = '';
      buildScript += appScript + '\n';
      buildScript += (`
        import __React from '${CDNBase}/react';
        import __ReactDOM from '${CDNBase}/react-dom/client';

        const base = document.getElementById('_reactbase');
        base.innerHTML = '';
        if (typeof window.React === 'undefined') window.React = __React;
        document.title = '${htmlName}';
        const root = __ReactDOM.createRoot(base);
        root.render(<${htmlName} />);
      `).replaceAll(/^[ \t]+/mg, '');

      //Transpile
      const transpiledScript = transpile(Babel, buildScript);
      const scriptElement = document.createElement('script');
      scriptElement.type = 'module';
      scriptElement.textContent = transpiledScript;
      document.getElementById('_reactscript').appendChild(scriptElement);
    } catch (e) {
      //Error!
      showErrorMessage(e.message);
      return;
    }
  })();
} else {
  //Node.js environment
  //Import modules
  let fs = require('fs');

  //Paramater
  let args = process.argv.slice(2);

  //Usage
  const usage = () => {
    console.log('Usage: node tinyreact.js [command]');
    console.log('command: create, execute, transpile');
    process.exit(128);
  };

  const usageCreate = () => {
    console.log('Usage: node tinyreact.js create [file type] [file name]');
    console.log('file type: html, tsx, both (default: both)');
    console.log('file name: file name without extension');
    process.exit(128);
  };

  const usageExecute = () => {
    console.log('Usage: node tinyreact.js execute [file name] [port] [shutdown time]');
    console.log('file name: file name without extension');
    console.log('port: port number (default: + ' + DefaultPort + ')');
    console.log('shutdown time: Local HTTP server shutdown time (s) (default: ' + DefaultShutdownTime / 1000 + ')');
    process.exit(128);
  };

  const usageTranspile = () => {
    console.log('Usage: node tinyreact.js transpile [tsx file path]');
    console.log('tsx file path: file path without extension');
    process.exit(128);
  };

  //If there are no parameters, output USAGE and exit
  if (args.length === 0) {
    usage();
  }

  //Set the current directory to the same directory as the running tinyreact.js
  process.chdir(__dirname);

  let argName;

  if (args[0] === 'create') {
    //Get the file name and type from the parameter
    let argType;
    if (args.length === 1) {
      console.log('Error: No file name specified.');
      usageCreate();
    } else if (args.length === 2) {
      argName = args[1];
      argType = 'both';
    } else {
      argName = args[2];
      argType = args[1];
      if (argType !== 'html' && argType !== 'tsx' && argType !== 'both') {
        console.log('Error: Invalid type specified.');
        usageCreate();
      }
    }

    //HTML Template
    let templateHTML = (`
      <!DOCTYPE html>
      <html lang="ja">

      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${BootstrapCSSURL}" rel="stylesheet" />
        <script type="module" src="./tinyreact.js"></script>
        <title>Loading...</title>
      </head>

      <body>
        <div id="_reactbase">
          <div id="loading" class="d-flex align-items-center justify-content-center" style="width:100vw; height:100vh;">
            <span class="spinner-border" role="status"></span>
            <span style="margin-left:5px;">Just a moment...</span>
          </div>
        </div>
        <div id="_reactscript" style="display:none"></div>
      </body>

      </html>
    `).replaceAll(/^      /mg, '').trim();

    //tsx Template
    let templateTSX = (`
      import React from 'react';

      const ${argName} = () => {
        return (
          <>
          </>
        );
      };

      export default ${argName};
    `).replaceAll(/^      /mg, '').trim();

    //Check if the file to be generated already exists
    const fileCheck = (fileName) => {
      if (fs.existsSync(fileName)) {
        console.log('Error: ' + fileName + ' already exists.');
        process.exit(1);
      }
    }

    if (argType === 'html' || argType === 'both') {
      fileCheck(argName + '.html');
    }
    if (argType === 'tsx' || argType === 'both') {
      fileCheck(argName + '.tsx');
    }

    //Create a file
    try {
      if (argType === 'html' || argType === 'both') {
        fs.writeFileSync(argName + '.html', templateHTML);
        console.log('Created: ' + argName + '.html');
      }

      if (argType === 'tsx' || argType === 'both') {
        fs.writeFileSync(argName + '.tsx', templateTSX);
        console.log('Created: ' + argName + '.tsx');
      }
    } catch (err) {
      console.log('Error: ' + err);
      process.exit(1);
    }

    //Exit
    process.exit(0);
  } else if (args[0] === 'execute') {
    //import modules
    const http = require('http');
    const path = require('path');
    const child_process = require('child_process');

    //Get MIME type from file name
    const getMimeType = (filename) => {
      // Use Node.js path module to get the file extension
      const ext = path.extname(filename);

      switch (ext.toLowerCase()) {
        case '.js':
          return 'application/javascript';
        case '.html':
          return 'text/html';
        case '.tsx':
          return 'application/x-typescript'; // There's no official MIME type for TSX
        default:
          return 'text/plain';
      }
    };

    // Open the browser
    const openBrowser = (url) => {
      let result;
      switch (process.platform) {
        case 'darwin':
          result = child_process.execSync('open ' + url);
          break;
        case 'win32':
          result = child_process.execSync('start ' + url);
          break;
        case 'linux':
          result = child_process.execSync('xdg-open ' + url);
          break;
        default:
          throw new Error('Unsupported platform: ' + process.platform);
      }

      return result;
    }

    //Get the file name and port number from the parameter
    if (args.length === 1) {
      console.log('Error: No file name specified.');
      usageExecute();
    } else if (args.length === 2) {
      argName = args[1];
      argPort = DefaultPort;
      argTime = DefaultShutdownTime;
    } else if (args.length === 3) {
      argName = args[1];
      argPort = args[2];
      argTime = DefaultShutdownTime;
    } else {
      argName = args[1];
      argPort = parseInt(args[2]);
      argTime = parseInt(args[3] * 1000);
    }

    //Check if the port number is valid
    if (argPort < 1024 || argPort > 65535) {
      console.log('Error: Invalid port number specified.');
      usageExecute();
    }

    //Exist html file check
    if (!fs.existsSync(argName + '.html')) {
      console.log('Error: ' + argName + '.html does not exist.');
      process.exit(1);
    }

    //Create local HTTP server
    const server = http.createServer((req, res) => {
      const filePath = path.join(__dirname, req.url === '/' ? '/index.html' : req.url);
      try {
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end(JSON.stringify(err));
          } else {
            let mtype = getMimeType(filePath);
            res.writeHead(200, { 'Content-Type': mtype });
            res.end(data);
          }
        });
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify(err));
      }
    });

    //Start the server
    server.listen(argPort, async () => {
      console.log('Server is running at http://localhost:' + argPort + '/');
      openBrowser('http://localhost:' + argPort + '/' + argName + '.html');
      setTimeout(() => {
        //Shut down the server after a certain period of time
        console.log('Shutting down server...');
        server.close();
        process.exit(0);
      }, argTime);
    });
  } else if (args[0] === 'transpile') {
    let compileFile = '';

    if (args.length === 1) {
      console.log('Error: No file name specified.');
      usageTranspile();
    } else {
      compileFile = args[1];
    }

    //Check if the file to be generated already exists
    if(fs.existsSync(compileFile + TranspileSuffix)) {
      console.log('Error: ' + compileFile + TranspileSuffix +' already exists.');
      process.exit(1);
    }

    //import Babel Standalone
    let Babel = null;

    const transpileFile = (Babel) => {
      try {
        const buildScript = fs.readFileSync(compileFile + '.tsx', 'utf8');
        const replaceScript = replaceImport(buildScript);
        const transpiledScript = transpile(Babel, replaceScript);
        //Write to file
        fs.writeFileSync(compileFile + TranspileSuffix, transpiledScript);
        console.log('Created: ' + compileFile + TranspileSuffix);
        process.exit(0);
      } catch (e) {
        console.log('Error: ' + e);
        process.exit(1);
      }
    };

    const redirectGet = (() => {
      const http = require('http');
      const https = require('https');
      const url = require('url');

      return (urlStr, callback, count = 0) => {
        if (count > RedirectLimit) {
          throw new Error("Too many redirects");
        }

        const protocol = new URL(urlStr).protocol;
        const getFunc = protocol === 'http:' ? http.get : https.get;

        getFunc(urlStr, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let newURL = res.headers.location;
            try {
              new URL(res.headers.location);
            } catch(e) {
              newURL = url.resolve(urlStr, res.headers.location);
            }
            redirectGet(newURL, callback, count + 1);
          } else if (res.statusCode !== 200) {
            throw new Error(res.statusCode);
          } else {
            callback(res);
          }
        }).on('error', (e) => {
          throw new Error(e);
        });
      }
    })();

    try {
      //use installed Babel Standalone
      Babel = require('@babel/standalone');
      transpileFile(Babel);
    } catch (e) {
      //use CDN Babel Standalone
      const vm = require('vm');

      try {
        redirectGet(BabelURL, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const sandbox = {};
            vm.createContext(sandbox);
            vm.runInContext(data, sandbox);
  
            Babel = sandbox.Babel;
            transpileFile(Babel);
          });
        });
      } catch (e) {
        console.error("Error:", e);
      }
    }
  } else {
    console.log('Error: Invalid command specified.');
    usage();
  }
}