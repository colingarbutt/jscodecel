// not used any more - moved here for reference
//


// { id: "conv", evt: "conv", col: 15, row: 1, wid: 3, hgt: 1, btn: "Convert Trilium" },

// async evt_conv(eng) {
//    convert_trilium();

//    return { redraw: true, nstate: false };
// }

var htargetdir = null;
var copied_files = 0;
async function convert_trilium() {

   // select C:\Users\colin\Desktop\test files
   //
   if (!hrootdir) {
      hrootdir = await window.showDirectoryPicker();
   }

   let hexp = await hrootdir.getDirectoryHandle("Trilium export", { create: false });
   let hroot = await hexp.getDirectoryHandle("root", { create: false });
   htargetdir = await hrootdir.getDirectoryHandle("cpgfiles", { create: true });

   convert_trilium_folder(hroot, "root");
}

async function convert_trilium_folder(hfold, parent) {
   //
   // watch out for Trilium folders which have corresponding html files
   //
   for await (let entry of hfold.values()) {
      if (entry.kind == "directory") {
         convert_trilium_folder(entry, `${parent}.${entry.name}`);
      } else {
         let ext = file_extension(entry.name);
         switch (ext) {
            case "html": case "css": case "js": case "json": case "h": case "gif":
               copied_files++;
               if (copied_files < 9999) {
                  // console.log("copy file");
                  console.log(`${parent}.${entry.name}`);
                  let file = await entry.getFile();
                  let contents = await file.text();
                  // console.log(contents);

                  if (ext == "html") {
                     // remove up to & including: "<body class="ck-content">"
                     //
                     let bdy = contents.indexOf(`<body class="ck-content">`);
                     contents = contents.slice(bdy + 25)

                     // remove from "</body>" to end
                     //
                     bdy = contents.indexOf("</body>");
                     contents = contents.slice(0, bdy);

                     let nam = entry.name.substring(0, entry.name.length - 5);
                     let fnd = `<img src="${encodeURI(nam)}/`;
                     let rep = `<img src="cpgfiles/${encodeURI(parent)}.${encodeURI(nam)}.`;
                     // console.log(`${fnd} -> ${rep}`);
                     contents = contents.replaceAll(fnd, rep);
                  }


                  let newFileHandle = await htargetdir.getFileHandle(`${parent}.${entry.name}`, { create: true });
                  let writable = await newFileHandle.createWritable();
                  await writable.write(contents);
                  await writable.close();
               }
               break;
            case "png": case "jpg":
               copied_files++;
               if (copied_files < 9999) {
                  // console.log("copy file");
                  console.log(`${parent}.${entry.name}`);
                  let file = await entry.getFile();
                  let contents = await file.arrayBuffer();
                  // console.log(contents);

                  let newFileHandle = await htargetdir.getFileHandle(`${parent}.${entry.name}`, { create: true });
                  let writable = await newFileHandle.createWritable();
                  await writable.write(contents);
                  await writable.close();
               }
               break;
            default:
               console.log(`????????????????????????????????  ${parent}.${entry.name}`);
               break;
         }
      }
   }
}
