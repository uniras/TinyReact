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
      document.getElementsByTagName('head')[0].appendChild(element);
      return promise;
    };

    const showErrorMessage = (message) => {
      console.log('There was a problem: ' + message);
      let loadinghtml = document.getElementById('loading');
      loadinghtml.innerHTML = '<span style="color:red;">Error! ' + message + '</span>';
    }

    //Load and Setting Babel
    try {
      await importScript(BabelURL);
    } catch (e) {
      //Network Error!
      showErrorMessage(e.message);
      return;
    }
    Babel.registerPreset('tsx', {
      presets: [
        [Babel.availablePresets[BabelPreset], BabelOption]
      ],
    });

    //Load [HTML file name].tsx file
    let htmlName = window.location.pathname.split('/').pop().replace(/\.html?$/i, '');
    let fetchResponse;
    try {
      fetchResponse = await fetch(htmlName + '.tsx');
      if (!fetchResponse.ok) {
        throw new Error(`HTTP status: ${fetchResponse.status}`);
      }
    } catch (e) {
      //Network Error!
      showErrorMessage(e.message);
      return;
    }
    let tsxContents = await fetchResponse.text();

    //Convert to CDN URL if not a direct URL specification and not a relative path
    let importRegex = /(import[ \t]+?)([^'"]*?)([ \t]+from[ \t]+)?(['"])([^'"]*)(['"];?)/g;
    let appScript = tsxContents.replace(importRegex, (match, importStr, varStr, fromStr, quoteL, modName, quoteR) => {
      if (!modName.startsWith('./') && !modName.startsWith('http://') && !modName.startsWith('https://')) {
        modName = CDNBase + modName;
      }
      return importStr + varStr + fromStr + quoteL + modName + quoteR;
    });

    //Building Script
    let buildScript = '';
    buildScript += appScript + '\n';
    buildScript += (`
      import __React from '${CDNBase}/react';
      import __ReactDOM from '${CDNBase}/react-dom/client';

      document.body.innerHTML = '';
      const div = document.createElement('div');
      document.body.appendChild(div);
      if (typeof window.React === 'undefined') window.React = __React;
      document.title = '${htmlName}';
      const root = __ReactDOM.createRoot(div);
      root.render(<${htmlName} />);
    `).replaceAll(/^[ \t]+/mg, '');
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/babel';
    scriptElement.dataset.type = 'module';
    scriptElement.dataset.presets = 'tsx,react';
    scriptElement.textContent = buildScript;
    document.getElementsByTagName('head')[0].appendChild(scriptElement);

    //Transpile
    Babel.transformScriptTags();
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
    console.log('command: create, execute');
  }

  const usageExecute = () => {
    console.log('Usage: node tinyreact.js execute [file name] [port]');
    console.log('file name: file name without extension');
    console.log('port: port number (default: 8080)');
    process.exit(128);
  }

  const usageCreate = () => {
    console.log('Usage: node tinyreact.js create [file type] [file name]');
    console.log('file type: html, tsx, both (default: both)');
    console.log('file name: file name without extension');
    process.exit(128);
  }

  //If there are no parameters, output USAGE and exit
  if (args.length === 0) {
    usage();
  }

  if (args[0] === 'create') {
    //Get the file name and type from the parameter
    let argName;
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

    //Set the current directory to the same directory as the running tinyreact.js
    process.chdir(__dirname);

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
        <div id="loading" class="d-flex align-items-center justify-content-center" style="width:100vw; height:100vh;">
          <span class="spinner-border" role="status"></span>
          <span style="margin-left:5px;">Just a moment...</span>
        </div>
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
    if (argType === 'html' || argType === 'both') {
      fs.writeFileSync(argName + '.html', templateHTML);
      console.log('Created: ' + argName + '.html');
    }

    if (argType === 'tsx' || argType === 'both') {
      fs.writeFileSync(argName + '.tsx', templateTSX);
      console.log('Created: ' + argName + '.tsx');
    }

    //Exit
    process.exit(0);
  } else if (args[0] === 'execute') {
    //Get the file name and port number from the parameter
    if (args.length === 1) {
      console.log('Error: No file name specified.');
      usageExecute();
    } else if (args.length === 2) {
      argName = args[1];
      argPort = 8080;
    } else {
      argName = args[1];
      argPort = args[2];
      if (argPort < 1024 || argPort > 65535) {
        console.log('Error: Invalid port number specified.');
        usageExecute();
      }
    }

    //Exist html file check
    if (!fs.existsSync(argName + '.html')) {
      console.log('Error: ' + argName + '.html does not exist.');
      process.exit(1);
    }

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
          result = child_process.spawn('open', [url]);
          break;
        case 'win32':
          result = child_process.spawn('start', [url]);
          break;
        case 'linux':
          result = child_process.spawn('xdg-open', [url]);
          break;
        default:
          throw new Error('Unsupported platform: ' + process.platform);
      }

      return result;
    }

    //Create local HTTP server
    const server = http.createServer((req, res) => {
      const filePath = path.join(__dirname, req.url === '/' ? '/index.html' : req.url);
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
    });

    //Start the server
    server.listen(argPort, async () => {
      console.log('Server is running at http://localhost:' + argPort + '/');
      openBrowser('http://localhost:' + argPort + '/' + argName + '.html');
      // Shutdown the server after 1 minute (60000 milliseconds)
      setTimeout(() => {
        console.log('Shutting down server after 1 minute...');
        server.close();
      }, 60000);
    });
  }
}
