{\rtf1\ansi\ansicpg936\cocoartf2869
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import \{ mkdir, rm, copyFile \} from "node:fs/promises";\
import \{ dirname, resolve \} from "node:path";\
import \{ fileURLToPath \} from "node:url";\
\
const __dirname = dirname(fileURLToPath(import.meta.url));\
const root = resolve(__dirname, "..");\
const distDir = resolve(root, "dist");\
\
await rm(distDir, \{ recursive: true, force: true \});\
await mkdir(resolve(distDir, "src"), \{ recursive: true \});\
await copyFile(resolve(root, "index.html"), resolve(distDir, "index.html"));\
await copyFile(resolve(root, "src/main.js"), resolve(distDir, "src/main.js"));\
\
console.log("Build completed: dist/index.html generated.");}