#!/usr/bin/env node
// Simple generator: fetches the world-atlas TopoJSON, strips geometry properties, rounds arcs to reduce precision and writes a trimmed file.

const fs = require('fs');
const path = require('path');
const https = require('https');

async function fetchJson(url){
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if(res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
      });
    }).on('error', reject);
  });
}

async function main(){
  const url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  console.log('Fetching TopoJSON from', url);
  const topo = await fetchJson(url);

  // strip properties on geometries
  if(topo.objects){
    Object.keys(topo.objects).forEach(k => {
      const obj = topo.objects[k];
      if(obj && obj.geometries && Array.isArray(obj.geometries)){
        obj.geometries.forEach(g => { if(g.properties) delete g.properties; });
      }
    });
  }

  // round arc coordinates to 2 decimal places to shave bytes
  if(Array.isArray(topo.arcs)){
    topo.arcs = topo.arcs.map(arc => arc.map(point => point.map(n => Math.round(n * 100) / 100)));
  }

  // remove bbox if present
  if(topo.bbox) delete topo.bbox;

  const outDir = path.join(process.cwd(), 'data');
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, 'countries-110m-trimmed.json');
  fs.writeFileSync(outPath, JSON.stringify(topo));
  console.log('Trimmed TopoJSON written to', outPath);
}

main().catch(err => { console.error(err); process.exit(1); });
