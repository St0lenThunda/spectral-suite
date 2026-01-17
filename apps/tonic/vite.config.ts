import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevTools from 'vite-plugin-vue-devtools'

import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig( {
  plugins: [
    vue(),
    VueDevTools(),
    {
      name: 'serve-docs',
      configureServer ( server ) {
        // Serve "docs" folder at /docs endpoint, but ONLY in dev mode
        // Resolve to project root (../../docs/.vitepress/dist)
        const docRoot = path.resolve( __dirname, '../../docs/.vitepress/dist' );

        server.middlewares.use( '/docs', ( req, res, next ) => {
          let url = req.url || '/';
          if ( url.endsWith( '/' ) ) url += 'index.html';

          // Basic path normalization
          const filePath = path.join( docRoot, url.split( '?' )[0] );

          console.log( `[Docs Middleware] Request: ${req.url} -> File: ${filePath} (Exists: ${fs.existsSync( filePath )})` );

          if ( fs.existsSync( filePath ) && fs.statSync( filePath ).isFile() ) {
            const ext = path.extname( filePath );
            const type = ext === '.html' ? 'text/html' :
              ext === '.css' ? 'text/css' :
                ext === '.js' ? 'application/javascript' :
                  ext === '.png' ? 'image/png' : 'text/plain';

            res.setHeader( 'Content-Type', type );
            fs.createReadStream( filePath ).pipe( res );
            return;
          }
          next();
        } );
      }
    }
  ],
  resolve: {
    dedupe: ['vue', 'pinia']
  },
  server: {
    port: 5000
  }
} )
