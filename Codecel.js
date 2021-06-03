

export class Codecel {
   static log;


   static process(prs) {
      // prs.log("codecel");
      // console.log(prs);
      this.log = prs.log;
      let vars = "";
      let glob_vars = "";

      for (let glb in prs.globals) {
         if (typeof prs.globals[glb] == "string") {
            glob_vars += `let ${glb} = "${prs.globals[glb]}";`;
         } else {
            glob_vars += `let ${glb} = ${prs.globals[glb]};`;
         }
      }
      // console.log(glob_vars);

      prs.editor.model.change(async writer => {
         const root = prs.editor.model.document.getRoot();
         //console.log("root:", root);
         // map(root, 0, 0);

         let code = false;
         //         let fmt = { data: "" };
         let settings = { wid: 10, aln: "L", nbr: "" };
         //         let fmt = { wid: 10, aln: "L", nbr: "" };
         //         let use_globals = false;
         let code_rows = 0;

         for (let child of root.getChildren()) {
            // top level only - no nested tables
            //
            if (child.name == "table") {
               for (let row of child.getChildren()) {
                  let dims = 1;
                  let nam = this.ele_text(row.getChild(0));

                  if (nam.startsWith("{{")) {
                     code = true;
                     code_rows = 0;

                  } else if (nam == "}}") {
                     code = false;

                  } else if (nam == "**") {
                     let sets = this.mini_json(this.ele_text(row.getChild(1)));
                     settings = Object.assign(settings, sets);
                     // console.log("settings: ", settings);

                  } else {
                     code_rows++;
                     if (code) {
                        let global = false;
                        if (nam.startsWith("VAR ")) {
                           global = true;
                           nam = nam.substring(4);
                        }
                        // ensure all code is italic
                        //
                        this.add_attributes(writer, row.getChild(1), { italic: true });

                        let cod = this.ele_text(row.getChild(1));
                        let have_code = (cod != "" && cod != "[]");

                        // get existing data
                        //
                        let dat = "";
                        if (cod == "[]") {
                           dims = row.childCount - 2;
                        }

                        if (!have_code) {    // don't fetch dat if we have code to execute
                           if (dims == 1) {
                              dat = Number(this.ele_text(row.getChild(2)));

                           } else {
                              dat = [];
                              for (let d = 0; d < dims; d++) {
                                 dat[d] = Number(this.ele_text(row.getChild(2 + d)));
                              }
                           }
                           //console.log("dat: ", dat);
                        }
                        let have_ndat = false;
                        let ndat = dat;

                        if (have_code) {
                           have_ndat = true;   // most times code makes data
                           //console.log("cod: ", cod);
                           let ss = cod.split(",");
                           if (ss[0] == "SUM") {
                              let nrows = code_rows - 1;
                              if (ss.length > 1) {
                                 nrows = this.eval_it(glob_vars + vars + ss[1]);
                              }
                              //console.log("SUM rows", nrows);
                              ndat = 0.0;
                              let prev_row = row;
                              for (let i = 0; i < nrows; i++) {
                                 prev_row = prev_row.previousSibling;
                                 if (prev_row == null) break;
                                 let pdat = Number(this.ele_text(prev_row.getChild(2)));
                                 // console.log("pdat", pdat);
                                 if (!Number.isNaN(pdat)) ndat += Number(pdat);
                              }

                           } else {
                              ndat = this.eval_it(glob_vars + vars + cod);
                              if (Array.isArray(ndat)) {
                                 dims = ndat.length;
                              }
                           }
                        }
                        // should have dims by now
                        //console.log("dims: ", dims);

                        // update vars if we have var def
                        //
                        if (nam != "" && ndat != "") {
                           if (global) {
                              if (nam in prs.globals) {     // don't redefine if already in globals
                                 vars += "/*var*/ ";
                              } else {
                                 vars += "var ";
                              }
                           } else {
                              vars += "let ";
                           }

                           if (dims == 1) {
                              vars += nam + " = " + ndat + ";";

                           } else {
                              vars += nam + " = [";
                              for (let d = 0; d < dims; d++) {
                                 if (d > 0) vars += ",";
                                 vars += ndat[d];
                              }
                              vars += "];";
                           }
                        }

                        // ouput ndat
                        //
                        if (have_code && have_ndat) {
                           // console.log("ndat: ", ndat);
                           if (dims == 1) {
                              let nsdat = this.format(ndat, settings);
                              this.set_cell_data(writer, row, 2, nsdat);

                           } else {
                              for (let d = 0; d < dims; d++) {
                                 let nsdat = this.format(ndat[d], settings);
                                 this.set_cell_data(writer, row, 2 + d, nsdat);
                              }
                           }
                        }
                     }
                  }
               }
            }
         }
      })


      let changed = 0;
      let ss = vars.split(";");
      for (let i = 0; i < ss.length - 1; i++) {  // extra one from last ;
         let st = ss[i].trim();
         // console.log("st: ", st);
         let ss1 = st.split(" ");
         if (ss1[0].trim() == "var" || ss1[0].trim() == "/*var*/") {
            let nam = ss1[1].trim();
            let val = Number(ss1[3].trim());
            if (nam in prs.globals) {
               if (prs.globals[nam] != val) {
                  changed++;
               }
            } else {
               changed++;
            }
            prs.globals[nam] = val;
            // glob_vars += `let ${ss1[1].trim()} = ${ss1[3].trim()};`;
         }
      }
      prs.globals_changed = (changed > 0);

      // console.log("vars:");
      // console.log(vars);
      // console.log("prs:");
      // console.log(prs);
   }


   static ele_text(ele) {
      let txt = "";
      if (ele.is('text') || ele.is('textProxy')) {
         txt = ele.data;
      } else {
         for (const child of ele.getChildren()) {
            txt += this.ele_text(child);
         }
      }
      // console.log("txt: '"+txt+"'");
      return txt.trim();
   }

   static add_attributes(writer, ele, attrs) {
      // apply attributes to all "text" children of ele
      // don't need to check that attr already set
      //
      if (ele.is('text') || ele.is('textProxy')) {
         writer.setAttributes(attrs, ele);

      } else {
         for (const child of ele.getChildren()) {
            this.add_attributes(writer, child, attrs);
         }
      }
   }

   static set_cell_data(writer, row, col, dat) {
      let cel = row.getChild(col); // tableCell

      //delete all children of cell
      //
      while (cel.childCount > 0) {
         writer.remove(cel.getChild(0));
      }
      writer.insertText(dat, { bold: true }, cel);

   }

   static format(dat, fmt) {
      if (fmt.nbr == "") {
         return dat.toString();
      }
      if (fmt.nbr.startsWith("f")) {
         let n = Number(fmt.nbr.substring(1));
         let s1 = Number(dat).toFixed(n);
         // right align
         if (s1.length < fmt.wid) {
            return " ".repeat(fmt.wid - s1.length) + s1;
         }
         return s1
      }
   }

   static eval_it(expr) {
      let res = 0;
      try {
         // Function("window." + key + " = " + JSON.stringify(json_obj.data[key]))()
         res = eval(expr);

      } catch (error) {
         this.log(error);
      }
      // console.log("eval_it: ", expr, res);
      return res;
   }

   static mini_json(txt) {
      let obj = {};
      let sin = txt.trim();
      if (sin.startsWith("{") && sin.endsWith("}")) {
         sin = sin.substring(1, sin.length - 1);
      }
      for (let s of sin.split(",")) {
         let ss = s.split(":");
         if (ss.length == 2) {
            obj[ss[0].trim()] = ss[1].trim();
         }
      }
      return obj;
   }
}
