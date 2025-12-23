import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <meta name="application-name" content="TokenClub" />
        <meta name="author" content="TokenClub" />
        <meta name="keywords" content="Solana token creator, Solana token launchpad, SPL token creator, Token-2022, Solana liquidity manager, economical solana token launchpad" />
        <meta name="description" content="TokenClub - Create, swap, and manage Solana tokens instantly" />
        <link rel="canonical" href="https://tokenclub.fun/" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="TokenClub" />
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-navbutton-color" content="#000000" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        
        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tokenclub.fun/" />
        <meta property="og:title" content="TokenClub - Solana Token Platform" />
        <meta property="og:description" content="TokenClub - Create, swap, and manage Solana tokens instantly" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://tokenclub.fun/" />
        <meta property="twitter:title" content="TokenClub - Solana Token Platform" />
        <meta property="twitter:description" content="TokenClub - Create, swap, and manage Solana tokens instantly" />
        
        {/* Critical: Initialize util polyfill FIRST, before ANY modules load */}
        <Script
          id="util-polyfill-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                'use strict';
                try{
                  if(typeof globalThis==='undefined'){var globalThis=window||global||self||{};}
                  if(typeof global==='undefined'){var global=globalThis;}
                  if(typeof process==='undefined'){var process={env:{},browser:true,version:'',versions:{}};}
                  
                  // Create util polyfill IMMEDIATELY
                  var utilPolyfill={
                    inspect:function(obj,options){
                      try{return JSON.stringify(obj,null,2);}catch(e){return String(obj);}
                    },
                    format:function(){
                      try{
                        const args=Array.prototype.slice.call(arguments);
                        const first=args.shift();
                        if(typeof first!=='string'){return args.join(' ');}
                        let i=0;
                        return String(first).replace(/%[sdj%]/g,function(x){
                          if(x==='%%')return '%';
                          if(i>=args.length)return x;
                          const arg=args[i++];
                          switch(x){
                            case '%s': return String(arg);
                            case '%d': return String(Number(arg));
                            case '%j': try{return JSON.stringify(arg);}catch(e){return '[Circular]';}
                            default: return String(x);
                          }
                        }) + args.slice(i).join(' ');
                      }catch(e){return '';}
                    }
                  };
                  
                  // Assign to ALL locations IMMEDIATELY
                  globalThis.util=utilPolyfill;
                  global.util=utilPolyfill;
                  window.util=utilPolyfill;
                  self.util=utilPolyfill;
                  
                  // Make require('util') work
                  if(typeof globalThis.require==='undefined'){
                    globalThis.require=function(module){
                      if(module==='util'){return utilPolyfill;}
                      throw new Error('Cannot find module: '+module);
                    };
                  }
                  
                  // Initialize Error.codes
                  if(typeof Error!=='undefined'&&!Error.codes){Error.codes={};}
                  ['TypeError','ReferenceError','SyntaxError','RangeError','EvalError','URIError'].forEach(function(errorName){
                    try{
                      if(typeof globalThis[errorName]!=='undefined'&&globalThis[errorName]&&!globalThis[errorName].codes){
                        globalThis[errorName].codes={};
                      }
                    }catch(e){}
                  });
                  if(typeof globalThis!=='undefined'&&!globalThis.codes){globalThis.codes={};}
                  if(typeof globalThis!=='undefined'&&!globalThis.statusCodes){globalThis.statusCodes={};}
                  if(typeof globalThis!=='undefined'&&!globalThis.http){globalThis.http={};}
                  if(typeof globalThis.http!=='undefined'&&!globalThis.http.STATUS_CODES){globalThis.http.STATUS_CODES={};}
                }catch(e){
                  console.error('[init] Failed to initialize polyfills:',e);
                }
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

