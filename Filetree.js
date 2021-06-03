/**
 * desc  
 * *Parameters* 
 * - string `fnam` - file name eg: *"root.Projects.Motor control.Assembly.html"*  
 * 
 * *Returns*  
 * - array - of tree_data objects 
 */


/**
 * Support stuff for the File System Acess API
 */
export class Filetree {
   /**
    * name of the disk folder at the root eg. "cpgfiles"
    */
   rootdir;

   /**
    * FileSystemDirectoryHandle of rootdir or null
    */
   hrootdir;


   folder_tree_data;
   folder_tree_open;

   /**
    * 
    * @param {string} root the disk directory name to use as root
    */
   constructor(root) {
      this.rootdir = root;
      this.hrootdir = null;
      this.folder_tree_data = [];
      this.folder_tree_open = [];
   }

   /**
    * Builds an array of folder_tree_data objects 
    * from a filename  
    * *Parameters* 
    * - string `fnam` - file name eg: *"root.Projects.Motor control.Assembly.html"*  
    * 
    * *Returns*  
    * - array - of tree_data objects 
    */
   make_folder(fnam) {
      let flds = fnam.split(".");
      let td = this.folder_tree_data;
      for (let f = 0; f < flds.length - 2; f++) {
         let fld = flds[f];
         let i = td.findIndex((e) => { return (e.txt == fld) })
         if (i == -1) {
            let tn = {
               txt: fld, kids: [], fnam: flds.slice(0, f + 1).join("."), type: "fold"
            };
            tn.open = this.folder_tree_open.includes(tn.fnam);
            td.push(tn);
            td = tn.kids;
         } else {
            td = td[i].kids;
         }
      }
      return td;
   }

   list_open_folders(tds) {
      for (let td of tds) {
         if (td.kids.length) {
            if (td.open) {
               this.folder_tree_open.push(td.fnam);
            }
            this.list_open_folders(td.kids);
         }
      }
   }

   /**
    * Builds this.folder_tree_data[] from all the files found in the root folder
    */
   async folder_tree() {
      // get a dir listing of cpgfiles
      //
      if (!this.hrootdir) {
         this.hrootdir = await window.showDirectoryPicker();
      }

      let cpgfiles_dir = await this.hrootdir.getDirectoryHandle(this.rootdir, { create: false });
      let entries = [];
      for await (let entry of cpgfiles_dir.values()) {
         entries.push(entry);
      }
      // make sure they're in alphabetical order
      //
      entries.sort((a, b) => {
         var nameA = a.name.toUpperCase();
         var nameB = b.name.toUpperCase();
         if (nameA < nameB) {
            return -1;
         }
         if (nameA > nameB) {
            return 1;
         }
         return 0;
      });

      // if this.folder_tree_data[] exists - make an array of all the open folder fnams
      //
      //
      this.folder_tree_open = ["root"];
      if (this.folder_tree_data.length) {
         this.list_open_folders(this.folder_tree_data[0].kids);
      }
      this.folder_tree_data = [];
      this.folder_tree_data[0] = { txt: "root", kids: [], open: true, fnam: "root", type: "fold" };
      let kptr = this.folder_tree_data[0].kids;
      let ind = 0;

      for (let e = 0; e < entries.length; e++) {
         let entry = entries[e];
         let ext = this.file_extension(entry.name);
         let nam = this.file_name(entry.name);

         // list out folders
         //
         switch (ext) {    // only consider these types
            case "html": case "css": case "js": case "json": case "h":
               // console.log(entry.name);
               let td = this.make_folder(entry.name);
               td.push({ txt: nam, kids: [], open: false, fnam: entry.name, type: ext, icon: ext })
               break;
         }

         // console.log(entry.name);
         // console.log(`${".".repeat(n-3)} ${ss[n-3]}  ${ss[n-2]}.${ss[n-1]}`)
         // console.log(`dad=${dad} ${ss[dad]}  file=${ss[n - 2]}.${ss[n - 1]}`)
      }
      // console.log(this.folder_tree_data);
      // console.log(this.folder_tree_open);
   }


   /**
    *  Reads the text from a file  
    * *Parameters* 
    * - string `fnam` - file name 
    * *Returns*  
    * - string - the file contents
    */
   async read_file(fnam) {
      let cpgfiles_dir = await this.hrootdir.getDirectoryHandle(this.rootdir, { create: false });
      let hcpg_file = await cpgfiles_dir.getFileHandle(fnam, { create: false });
      let cpg_file = await hcpg_file.getFile();
      let ftxt = await cpg_file.text();
      return ftxt;
   }

   /**
    *  Writes a string to a file  
    * *Parameters* 
    * - string `fnam` - file name 
    * - string `ftxt` - text to write 
    */
   async write_file(fnam, ftxt) {
      let cpgfiles_dir = await this.hrootdir.getDirectoryHandle(this.rootdir, { create: false });
      let hcpg_file = await cpgfiles_dir.getFileHandle(fnam, { create: true });
      let cpg_file = await hcpg_file.createWritable();
      await cpg_file.write(ftxt);
      await cpg_file.close();
   }

   /**
    *  Moves a file to root.bin with the current date & time in the new file name eg:  
    *  *"root.Projects.Motor control.Assembly.html"*  
    *  is renamed to:   
    *  *"root.bin.2011-10-05T14:48:00_Assembly.html"*  
    * *Parameters* 
    * - string `fnam` - file name to delete  eg: *"root.Projects.Motor control.Assembly.html"* 
    */
   async delete_file(fnam) {

      let now = new Date();
      let iso = now.toISOString();  // eg 2011-10-05T14:48:00.000Z
      let ss = iso.split(".");   // get rid of .000Z
      iso = ss[0];
      iso = iso.replaceAll("-", ""); 
      iso = iso.replaceAll("T", " "); 
      iso = iso.replaceAll(":", ""); 
      let bin_name = `root.bin.${iso}_${this.file_name(fnam)}.${this.file_extension(fnam)}`;
      
      let txt = await this.read_file(fnam);
      await this.write_file(bin_name, txt);

      // now delete fnam
      let cpgfiles_dir = await this.hrootdir.getDirectoryHandle(this.rootdir, { create: false });
      await cpgfiles_dir.removeEntry(fnam);
   }
   /**
    *  Extracts the extension from a filename   
    * *Parameters* 
    * - string `fnam` - file name eg: *"root.Projects.Motor control.Assembly.html"*  
    * 
    * *Returns*  
    * - string - extension eg: html
    */
   file_extension(fnam) {
      let ss = fnam.split(".");
      let n = ss.length;
      if (n > 1) {
         return ss[n - 1].toLowerCase();
      } else {
         return "";
      }
   }

   /**
    *  Extracts the main filename from a file name   
    * *Parameters* 
    * - string `fnam` - file name eg: *"root.Projects.Motor control.Assembly.html"*  
    * 
    * *Returns*  
    * - string - name eg: Assembly
    */
   file_name(fnam) {
      let ss = fnam.split(".");
      let n = ss.length;
      if (n > 1) {
         return ss[n - 2];
      } else {
         return "";
      }
   }
}

