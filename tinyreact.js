//Determining if it is a Node.js environment
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null && process.release.name === 'node';

//Option Variables
//Base URL for importing modules from CDN
const CDNBase = 'https://jspm.dev/';
//CDN URL for Bootstrap CSS Library
const BootstrapCSSURL = 'https://unpkg.com/bootstrap/dist/css/bootstrap.min.css';
//CDN URL for Babel Standalone Library
const BabelURL = 'https://unpkg.com/@babel/standalone/babel.min.js';

if (isNode) {
  //Node.js environment
  //Import modules
  let fs = require('fs');

  //Paramater
  let args = process.argv.slice(2);

  //If there are no parameters, output USAGE and exit
  if (args.length === 0) {
    console.log('Usage: node tinyreact.js [file type] [file name]');
    console.log('file type: html, tsx, both (default: both)');
    process.exit(128);
  }

  //Get the file name and type from the parameter
  let argName;
  let argType;

  if (args.length === 1) {
    argName = args[0];
    argType = 'both';
  } else {
    argName = args[1];
    argType = args[0];
    if (argType !== 'html' && argType !== 'tsx' && argType !== 'both') {
      console.log('Error: Invalid type specified. (html, tsx, both)');
      console.log('Usage: node tinyreact.js [file type] [file name]');
      process.exit(128);
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
  `).replaceAll(/^    /mg, '').trim();

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
  `).replaceAll(/^    /mg, '').trim();

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
} else {
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
        [Babel.availablePresets['typescript'], { allExtensions: true, isTSX: true }]
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
      if (modName.indexOf('./') !== 0 && modName.match(/^https?:\/\//) === null) {
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
}
