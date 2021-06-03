import { Engine, Engine_framework, Tree_engine_framework, messages } from "../library/engine.js";
import { Filetree } from "./Filetree.js";
import { Codecel } from "./Codecel.js";

/* --------------------------------------------------------
   Main window framework 
      name:       main     
      container:  main_div - defined in index.html
*/
(new Engine(new class extends Engine_framework {

   show_ldlg;
   CKeditor;
   ACEeditor;
   current_editor;
   edi_dirty;
   inp_dirty;
   codecel;
   filetree;

   constructor() {
      super();
      this.board = { cols: 30, rows: 22, };

      this.divs = [
         { id: "start", evt: "start", col: 2, row: 1, wid: 2, hgt: 1, btn: "Start" },
         { id: "save", evt: "save", col: 4, row: 1, wid: 2, hgt: 1, btn: "Save" },
         { id: "dont", evt: "dont", col: 6, row: 1, wid: 2, hgt: 1, btn: "Don't Save" },
         { id: "fnew", evt: "fnew", col: 8, row: 1, wid: 2, hgt: 1, btn: "New" },
         { id: "fdel", evt: "fdel", col: 10, row: 1, wid: 2, hgt: 1, btn: "Delete" },
         { id: "ccel", evt: "ccel", col: 12, row: 1, wid: 2, hgt: 1, btn: "Codecel" },
         { id: "test1", evt: "test1", col: 18, row: 1, wid: 2, hgt: 1, btn: "Test1" },
         { id: "test2", evt: "test2", col: 20, row: 1, wid: 2, hgt: 1, btn: "Test2" },

         { id: "fnam", col: 8, row: 2, wid: 16, hgt: 1, drw: "fnam", cre: "fnam" },
         { id: "editor", col: 8, row: 3, wid: 22, hgt: 15, cre: "edit", drw: "edit" },

         { id: "tree", col: 2, row: 3, wid: 5, hgt: 15, drw: "tree" },
         { id: "console", col: 8, row: 19, wid: 15, hgt: 3 },
      ];

      this.show_ldlg = false;
      this.CKeditor = null;
      this.ACEeditor = null;
      this.current_editor = "CK";
      this.dirty = false;
      this.inp_dirty = false;
      this.filetree = new Filetree("cpgfiles");
   }

   create(ct, eng) {
      messages.tree_data = this.filetree.folder_tree_data;
      eng.send_message("main_tree", { subject: "init", report_to: "main_div" });
      // this.set_edi_dirty(false);
   }

   cre_edit(div, eng) {
      this.log("cre_edit");
      let main_editor = document.getElementById("main_editor");
      let div_ACE = document.createElement('div');
      div_ACE.id = "ACEeditor";
      main_editor.appendChild(div_ACE);

      this.ACEeditor = ace.edit("ACEeditor");
      this.ACEeditor.session.setMode("ace/mode/javascript");
      this.ACEeditor.setShowPrintMargin(false);
      div_ACE.classList.add("hidden");
      this.ACEeditor.getSession().on('change', () => {
         this.set_edi_dirty(true);
      });
      this.ACEeditor.setOptions({
         fontFamily: "Consolas",
         fontSize: "11pt"
      });

      let div_CK = document.createElement('div');
      div_CK.id = "CKeditor";
      main_editor.appendChild(div_CK);
      let div_ckedit = document.createElement('div');
      div_ckedit.id = "ckedit";
      div_CK.appendChild(div_ckedit);

      ClassicEditor
         .create(document.querySelector('#ckedit'), {

            toolbar: {
               items: [
                  'heading',
                  '|',
                  'bold',
                  'fontBackgroundColor',
                  'fontColor',
                  'fontSize',
                  'fontFamily',
                  'link',
                  'bulletedList',
                  'numberedList',
                  '|',
                  'alignment',
                  'outdent',
                  'indent',
                  '|',
                  'imageUpload',
                  'insertTable',
                  'mediaEmbed',
                  'htmlEmbed',
                  'undo',
                  'redo',
                  '|',
                  'removeFormat',
                  'codeBlock',
                  'blockQuote',
                  'horizontalLine',
                  'todoList'
               ]
            },
            language: 'en',
            image: {
               toolbar: [
                  'imageTextAlternative',
                  'imageStyle:full',
                  'imageStyle:side'
               ]
            },
            table: {
               contentToolbar: [
                  'tableColumn',
                  'tableRow',
                  'mergeTableCells',
                  'tableCellProperties',
                  'tableProperties'
               ]
            },
            licenseKey: '',


         })
         .then(editor => {
            // console.log(editor);
            this.CKeditor = editor;

            this.CKeditor.model.document.on('change:data', () => {
               this.set_edi_dirty(true);
            });

            // turn off spell checker
            //
            this.CKeditor.editing.view.change(writer => {
               writer.setAttribute('spellcheck', 'false', editor.editing.view.document.getRoot());
            });
         })
         .catch(error => {
            console.error(error);
            this.log(error);
         });

   }
   cre_fnam(div, eng) {
      let d = document.getElementById("main_fnam");
      d.innerHTML = `<input id="inp_fnam">`;
      // d.addEventListener('change', (event) => {
      //    this.set_inp_dirty(true);
      // });
      d.addEventListener('input', (event) => {
         this.set_inp_dirty(true);
      });
   }
   drw_fnam(div, eng) {
      return [];
   }
   drw_edit(div, eng) {
      // just resize
      let d = document.getElementById("main_editor");
      let root = document.documentElement;
      root.style.setProperty("--main_editor_height", `${d.offsetHeight}px`);
      return [];
   }
   drw_tree(div, eng) {
      // console.log("dra_tree");
      return [
         ["class", "yscrolling"],
         ["class", "borderbox"],
      ];
   }
   async evt_start(eng) {
      await this.filetree.folder_tree();
      messages.tree_data = this.filetree.folder_tree_data;
      eng.send_message("main_tree", { subject: "init", report_to: "main_div" });

      this.CKeditor.setData("");
      this.set_edi_dirty(false);
      this.set_inp_dirty(false);

      return { redraw: true, nstate: false };
   }

   async evt_save(eng) {
      // save the editor's content to the file name in inp_fnam
      //
      let fnam = document.getElementById("inp_fnam").value;
      if (fnam.length > 0) {
         await this.save_file(fnam);
         if (this.inp_dirty) {
            // change to filename or path
            // 
            await this.filetree.folder_tree();
            messages.tree_data = this.filetree.folder_tree_data;
            eng.send_message("main_tree", { subject: "init", report_to: "main_div" });
         }
         this.set_edi_dirty(false);
         this.set_inp_dirty(false);
      }

      return { redraw: true, nstate: false };
   }
   async evt_fnew(eng) {

      if (this.edi_dirty || this.inp_dirty) {
         window.alert("Data has changed - Save or Don't Save");
         return { redraw: false, nstate: false };
      }
      let fnam = document.getElementById("inp_fnam").value;
      if (fnam == "") {
         fnam = "root.noname.html";
      }
      // take off name and ext
      let ss = fnam.split(".");
      let nfil = ss.slice(0, -2).join(".") + ".newfile.html";
      this.log(nfil);
      this.change_editor("CK");
      this.editor_put_text("");
      let d = document.getElementById("inp_fnam");
      d.value = nfil;
      this.set_edi_dirty(true);
      this.set_inp_dirty(true);

      return { redraw: true, nstate: false };
   }
   async evt_fdel(eng) {
      if (this.edi_dirty || this.inp_dirty) {
         window.alert("Data has changed - Save or Don't Save");
         return { redraw: false, nstate: false };
      }
      let fnam = document.getElementById("inp_fnam").value;
      await this.filetree.delete_file(fnam);
      await this.filetree.folder_tree();
      messages.tree_data = this.filetree.folder_tree_data;
      eng.send_message("main_tree", { subject: "init", report_to: "main_div" });

      let d = document.getElementById("inp_fnam");
      d.value = "";
      this.editor_put_text("");
      this.set_edi_dirty(false);
      this.set_inp_dirty(false);

      return { redraw: true, nstate: false };
   }
   evt_dont(eng) {
      // if (this.current_file.length > 0) {
      //    this.update_dirty(false);
      // }
      this.set_edi_dirty(false);
      this.set_inp_dirty(false);
      return { redraw: true, nstate: false };
   }
   async evt_ccel(eng) {
      this.change_editor("CK");
      let prs = {
         editor: this.CKeditor,
         log: this.log
      }
      let glbs = await this.filetree.read_file("root.Globals.json");
      prs.globals = JSON.parse(glbs);
      prs.globals_changed = false;
      Codecel.process(prs);

      if (prs.globals_changed) {
         await this.filetree.write_file("root.Globals.json", JSON.stringify(prs.globals, null, 3));
      }
      return { redraw: true, nstate: false };
   }

   evt_test1(eng) {
      console.log(this.filetree);
      return { redraw: true, nstate: false };
   }
   evt_test2(eng) {
      let ck = document.getElementById("CKeditor");
      let ace = document.getElementById("ACEeditor");
      if (this.current_editor == "CK") {
         ck.classList.add("hidden");
         ace.classList.remove("hidden");
         this.current_editor = "ACE";

      } else {
         ace.classList.add("hidden");
         ck.classList.remove("hidden");
         this.current_editor = "CK";
      }
      return { redraw: true, nstate: false };
   }
   update_dirty() {
      let d1 = document.getElementById("main_save");
      let d2 = document.getElementById("main_dont");
      if (this.edi_dirty || this.inp_dirty) {
         d1.classList.remove("btn_disabled");
         d2.classList.remove("btn_disabled");
      } else {
         d1.classList.add("btn_disabled");
         d2.classList.add("btn_disabled");
      }
   }
   set_edi_dirty(dirt) {
      if (dirt != this.edi_dirty) {
         this.edi_dirty = dirt;
         this.update_dirty();
      }
   }
   set_inp_dirty(dirt) {
      if (dirt != this.inp_dirty) {
         this.inp_dirty = dirt;
         this.update_dirty();
      }
   }

   change_editor(ed) {
      if (this.current_editor != ed) {
         let ck = document.getElementById("CKeditor");
         let ace = document.getElementById("ACEeditor");
         switch (ed) {
            case "ACE":
               ck.classList.add("hidden");
               ace.classList.remove("hidden");
               this.current_editor = "ACE";
               break;

            case "CK":
               ace.classList.add("hidden");
               ck.classList.remove("hidden");
               this.current_editor = "CK";
               break;
         }
      }
   }
   editor_get_text() {
      switch (this.current_editor) {
         case "ACE":
            return this.ACEeditor.getValue();

         case "CK":
            return this.CKeditor.getData();
      }
   }
   editor_put_text(txt) {
      switch (this.current_editor) {
         case "ACE":
            this.ACEeditor.setValue(txt);
            this.ACEeditor.gotoLine(1, 0);
            break

         case "CK":
            this.CKeditor.setData(txt);
            break;
      }
   }

   async load_file(fnam) {
      let d = document.getElementById("inp_fnam");
      d.value = fnam;
      this.set_inp_dirty(false);

      let ftxt = await this.filetree.read_file(fnam);

      let html = "";
      switch (this.filetree.file_extension(fnam)) {
         case "html":
            html = ftxt;
            this.change_editor("CK");
            break;

         case "css":
            html = ftxt;
            // html = `<pre><code class="language-css">${ftxt}</code></pre>`;
            this.change_editor("ACE");
            break;

         case "js": case "json":
            html = ftxt;
            // html = `<pre><code class="language-javascript">${ftxt}</code></pre>`;
            this.change_editor("ACE");
            break;

         case "h":
            break;
      }
      this.editor_put_text(html);
      this.set_edi_dirty(false);
   }
   async save_file(fnam) {
      let html = this.editor_get_text();
      this.filetree.write_file(fnam, html);
   }
   log(...text) {
      let d = document.getElementById("main_console");
      if (d) {
         for (let txt of text) {
            let sp = document.createElement('span');
            sp.innerHTML += txt + "<br>";
            d.appendChild(sp);
            sp.scrollIntoView(false);
            console.log(txt);
         }
      }
   }

   message(cnt, eng) {
      let msg = eng.read_message();
      // this.log(`msg subject:${msg.subject}`);
      switch (msg.fid) {
         case "tree":
            switch (msg.subject) {
               case "selection":
                  if (this.edi_dirty || this.inp_dirty) {
                     // move selection back to this.current_file
                     //
                     eng.send_message("main_tree", { subject: "undo_selection" });
                     window.alert("Data has changed - Save or Don't Save");
                  } else {
                     this.load_file(msg.value.fnam);
                  }
                  return { redraw: true, nstate: false };
            }
            break
      }
      return { redraw: false, nstate: false };
   }

})).create_framework("main", "main_div");


/* --------------------------------------------------------
   file / folder tree
      name:       tree     
      container:  main_tree - defined in main
*/
(new Engine(new class extends Tree_engine_framework {

   constructor() {
      super();
      this.board = { cols: 11, rows: 15, };
   }

})).create_framework("tree", "main_tree");


