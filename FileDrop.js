/*
  TODO

  Document API.

  Add functions for extra parameters when uploading.
    Needed for associating multiple files in a file set.

  Add mime-type detection and filtering for client-side extracted files.

  A system for receiving information from the server about uploaded files, 
  both multi-file and files contained in zip files.
    This will be useful for large files that should not be loaded into
    client side memory before uploading.

----

  Add FileDrop parameter to change the POST parameter name 
  of the uploaded file.

  Check what is returned by API callbacks.
    Allow callbacks to skip a file (upload or receive file).
    Allow callbacks to modify the file array (drop, upload or receive) by returning a new array.
    
  Option to not automatically:
    trigger receive on drop
    trigger upload on drop

  Functions to trigger (if not automatically triggered):
    receive
    upload

  Include html example.
  Include server side examples:
    Rails controller example: Receive and save file. No model.
    PHP example: Receive and save file.

  Try to use FormData method instead, as shown here:
    http://www.deadmarshes.com/dnd.html

  Allow running on unsupported browsers (with warning).
    
*/

var FileDrop = {

    name: 'FileDrop',

    handlers: [],

    support: function() {
        if(!this.readSupport() && !this.uploadSupport()) {
            return false;
        } else {
            return true;
        }
    },

    readSupport: function() {
        if(((Browser.model == 'Firefox') && (Browser.version >= 4))
           || ((Browser.model == 'Chrome') && (Browser.version >= 13))) {
               return true;
           } else {
               return false;
           }
    },

    uploadSupport: function() {
        if(((Browser.model == 'Firefox') && (Browser.version >= 4))
           || ((Browser.model == 'Chrome') && (Browser.version >= 13))
           || ((Browser.model == 'Safari') && (Browser.version >= 5.1) && (Browser.OS == 'MacOS'))) {
               return true;
           } else {
               return false;
           }        
    },

    create: function(node_id, p) {

        if(Browser.model == 'Chrome') {
            XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
                var data = new ArrayBuffer(datastr.length);
                var ui8a = new Uint8Array(data, 0);
                for (var i=0; i<datastr.length; i++) {
                    ui8a[i] = (datastr.charCodeAt(i) & 0xff);
                }
                var bb;
                if(window.BlobBuilder) {
                    bb = new window.BlobBuilder();
                } else if(window.WebKitBlobBuilder) {
                    bb = new window.WebKitBlobBuilder();
                } else {
                    bb = new BlobBuilder();
                }
                bb.append(data);
                var blob = bb.getBlob();
                this.send(blob);
            }
        }

        // Check browser support and sanity of parameters

        if(!node_id || !$(node_id)) {
            alert(this.name + " could not find node with id '" + node_id + "' not found.\nInitialization aborted.");
            return false;
        }

        if(!this.support()) {
            alert(this.name + " is not supported by this browser");
            return false;
        } else {
            if(p.client_side_zip && !p.read_files) {
                alert("Client-side reading of zip files is not possible when client side reading of files has been disabled.\nInitialization aborted.");
                return false;
            }

            if(p.read_files && !this.readSupport()) {
                alert(this.name + " does not have read support on this browser.\nPlease set the read_files flag to false.\nInitialization aborted.");
                return false;
            }
            if(p.upload_files && !this.uploadSupport()) {
                alert(this.name + " does not have upload support on this browser.\nPlease set the upload_files flag to false.\nInitialization aborted.");
                return false;
            }
            if(p.upload_files && (!p.url || (p.url == ''))) {
                alert(this.name + " cannot upload files unless you provide a 'url' parameter when you call " + this.name + ".create.\nInitialization aborted.");
                return false;
            }
        }

        // Instantiate a new FileDrop handler

        var h = new this.Handler(this, node_id, p);
        this.handlers.push(h);
        return h;
    },

    // do not call this directly
    // call .destroy on the handler itself instead
    destroy: function(handler) {

        var i = this.handlers.indexOf(handler);
        if(i >= 0) {
            this.handlers.splice(i, 1);
            return true;
        } else {
            return false;
        }
    },

    Handler: function(parent, node_id, p) {

        this.archive_mime_types = [
            'application/zip'
        ];

        this.init = function() {

            this.parent = parent;
            this.node_id = node_id;

            this.p = Object.extend({
                client_side_zip: !!JSUnzip,
                url: null, // url for file upload
                read_files: this.parent.readSupport(), // read files into browser memory before uploading
                upload_files: this.parent.uploadSupport() // upload files when dropped
            }, p);

            // if the JSUnzip library is loaded 
            // and zip handling is not specifically disallowed
            // https://github.com/augustl/js-unzip
            if(this.p.client_side_zip) {
                // only if default rule is to disallow
                if(!this.p.disallow || (this.p.disallow.length <= 0)) {
                    // allow the zip file mime-types
                    var i;
                    for(i=0; i < this.archive_mime_types.length; i++) {
                        this.p.allow.push({mime_type: this.archive_mime_types[i]});
                    }
                }
            }

            if(!this.p.read_files && !this.p.upload_files) {
                alert('FileDrop should either enable read_files, upload_files, or both.\nYou have enabled neither (for element with id: '+this.node_id+').');
                return false;
            }

            this.default_msg = ["Upload Spot", "Drop files or click to upload."] || parms['default_msg']
            this.title_node_id = this.node_id+'_title' || parms['title_node_id']
            this.subtitle_node_id = this.node_id+'_subtitle' || parms['subtitle_node_id']
            
            $(this.node_id).addEventListener('dragenter', 
                                             this.on_enter.bindAsEventListener(this),
                                             false);
            
            $(this.node_id).addEventListener('dragexit', 
                                             this.on_exit.bindAsEventListener(this),
                                             false);
            
            $(this.node_id).addEventListener('dragover', 
                                             this.on_over.bindAsEventListener(this),
                                             false);
            
            $(this.node_id).addEventListener('drop', 
                                             this.on_drop.bindAsEventListener(this),
                                             false);

        };

        this.destroy = function() {
            alert('destroy: not implemented');

            // TODO 
            // do some removeEventListener stuff here.
            
            this.parent.destroy(this);
        };

        // pause drop functionality
        this.disable = function() {
            alert('disable: not implemented');
            // TODO writme
        };

        // resume drop functionality
        this.enable = function() {
            alert('enable: not implemented');
            // TODO writme
        };

        this.nop = function(e) {
            e.stopPropagation();
            e.preventDefault();
        };

        this.on_enter = function(e) {
            if(this.p.hover_class) {
                Element.addClassName(this.node_id, this.p.hover_class);
            }

            if(this.on_droparea_enter) {
                this.on_droparea_enter();
            }

            this.nop(e);
        };


        this.on_exit = function(e) {
            if(this.p.hover_class) {
                Element.removeClassName(this.node_id, this.p.hover_class);
            }

            if(this.on_droparea_exit) {
                this.on_droparea_exit();
            }

            this.nop(e);
        };

        this.on_over = function(e) {
            this.nop(e);
        };

        
        this.on_drop = function(e) {
            this.nop(e);
            
            var files = this.to_standard_files(e.dataTransfer.files);
            
            if(files.length < 1) {
                return false;
            }

            if(this.p.read_files) {
                this.receive_files(files);
            } else if(this.p.upload_files) {
                this.start_upload(files);
            }
        };
        

        this.filter = function(file) {
            var filter = true;
            var f;
            var disallowed_reasons = [];
            var allowed_reasons = [];
            var i, rule, ok;

            var file_type = file.type.toLowerCase();
            var file_name = file.name.toLowerCase();

            if(this.p.allow) {
                filter = true;
                for(i=0; i < this.p.allow.length; i++) {
                    f = true;
                    rule = this.p.allow[i];
                    if(rule.mime_type) {
                        if(file_type.match(rule.mime_type.toLowerCase())) {
                            allowed_reasons.push(rule);
                            f = false;
                        }
                    }
                    if(rule.extension) {
                        if(file_name.match(rule.extension.toLowerCase())) {
                            if(f != false) {
                                f = false;
                                allowed_reasons.push(rule)
                            }
                        } else {
                            filter = true;
                        }
                    }
                    if(!f) {
                        filter = false;
                    }
                }
            } else if(this.p.disallow) {
                filter = false;
                for(i=0; i < this.p.disallow.length; i++) {
                    f = false;
                    rule = this.p.disallow[i];
                    if(rule.mime_type) {
                        if(file_type.match(rule.mime_type.toLowerCase())) {
                            disallowed_reasons.push(rule);
                            f = true;
                        }
                    }
                    if(rule.extension) {
                        if(file_name.match(rule.extension.toLowerCase())) {
                            if(f != true) {
                                f = true;
                                disallowed_reasons.push(rule);
                            }
                        } else {
                            f = false;
                        }
                    }
                    if(f) {
                        filter = true;
                    }
                }
            } else {
                return false;
            }

            if(filter && this.on_disallowed_file) {
                this.on_disallowed_file(file, disallowed_reasons);
            }
            if(!filter && this.on_allowed_file) {
                this.on_allowed_file(file, allowed_reasons);
            }

            return filter;
        };
                        
        this.start_upload = function(files) {

            this.cur_file_index = 0;

            if(this.p.read_files) {
                this.files_to_upload = this.received_files;
            } else {
                this.files_to_upload = files;
            }

            if(this.on_upload_begin) {
                this.on_upload_begin(this.files_to_upload);
            }

            this.uploaded_files = [];
            this.upload_next_file();
        };

        this.all_uploads_completed = function() {
            if(this.p.hover_class) {
                Element.removeClassName(this.node_id, this.p.hover_class);
            }
            if(this.on_upload_complete) {
                this.on_upload_complete(this.uploaded_files);
            }
        };

        this.upload_next_file = function() {

            if(this.cur_file_index >= this.files_to_upload.length) {
                if(this.uploaded_files.length <= 0) {
                    alert("Error! No files uploaded!");
                    return false;
                }
                this.all_uploads_completed();
                return true;
            }

            // if the list of files wasn't filtered in receive,
            // filter now
            var file = null;
            if(!this.p.read_files) {
                var msg;
                while(!file) {
                    file = this.files_to_upload[this.cur_file_index];
                    msg = this.filter(file);

                    if(msg) {
                        this.cur_file_index += 1;
                        file = null;
                        if(this.cur_file_index >= this.files_to_upload.length) {
                            this.all_uploads_completed();
                            return true;
                        }
                    }
                }
            } else {
                file = this.files_to_upload[this.cur_file_index];
            }

            if(this.on_upload_file_begin) {
                this.on_upload_file_begin(file);
            }

            this.xhr_upload(file);
        };

        this.xhr_upload = function(file) {

            this.xhr = new XMLHttpRequest();

            this.xhr.upload.addEventListener('progress', this.upload_progress.bindAsEventListener(this), false);

            this.xhr.upload.addEventListener('error',
                                             this.upload_error.bindAsEventListener(this), false);

            this.xhr.upload.addEventListener('abort',
                                             this.upload_aborted.bindAsEventListener(this), false);

            this.xhr.onreadystatechange = this.ready_state_change.bindAsEventListener(this);

            this.xhr.open('POST', this.p.url);

            if(this.p.read_files) {
                var request = this.build_request(file);
                this.xhr.sendAsBinary(request);
            } else {
                var form_data = this.build_form_data(file);
                this.xhr.send(form_data);
            }
        };

        this.build_form_data = function(file) {

            var form_data = new FormData();
            form_data.append('file[file]', file.file);
            return form_data;
        };

        this.build_request = function(file) {
            var bound = '';
            var i;
            for(i=0;i < 3; i++) {
                bound += Math.floor(Math.random()*32768);
            }

            var content_type = 'multipart/form-data; boundary='+bound;

            var request = '--' + bound + "\r\n";

            request += 'Content-Disposition: form-data; ';
            request += 'name="' + 'file[file]' + '"; ';
            request += 'filename="' + file.name + '"' + "\r\n";

            request += "Content-Type: application/octet-stream" + "\r\n\r\n";
            request += file.data + "\r\n";
            request += "--" + bound + "--\r\n";

            this.xhr.setRequestHeader('Content-Type', content_type);

            return request;
        };
        
        this.to_standard_files = function(objs) { 
            var i;
            var files = []
            for(i=0; i < objs.length; i++) {
                files.push(this.to_standard_file(objs[i], null));
            }
            return files;
        };

        this.to_standard_file = function(obj, data, parent_archive) {
            var ret;
            if(obj.name) {
                ret =  {
                    type: obj.type || 'text/plain',
                    name: obj.name,
                    data: data || obj.value,
                    file: obj,
                    entry: null,
                    parent_archive: null,
                    is_archive: false
                };
            } else if(obj.fileName && obj.data) {
                ret = {
                    type: 'unknown', // TODO mime-type?
                    name: obj.fileName,
                    data: data || obj.data,
                    file: null,
                    entry: obj,
                    parent_archive: parent_archive || null,
                    is_archive: false
                };
            } else {
                alert("Received a file with no name.\nNo idea what to do.\nUpload aborted.\n");
                return false;
            }

            if(this.is_archive(ret)) {
                ret.is_archive = true;
            }
            return ret;
        };

        this.upload_error = function(e) {
            if(this.xhr.status != 200) {
                if(this.on_upload_error) {
                    this.on_upload_error(this.xhr.status, this.xhr.responseText);
                }
            } else {
                this.on_upload_error(null, null);
            }
        };

        this.upload_aborted = function(e) {
            if(this.on_upload_aborted) {
                this.on_upload_aborted();
            }
        };
        
        this.upload_progress = function(e) {
            var bytes_received = null;
            var bytes_total = null;

            if(e.lengthComputable) {
                bytes_received = e.loaded;
                bytes_total = e.total;
            }
            
            // Needed because we can't get this in xhr.onreadystatechange
            // we could use xhr.upload.load instead, but Safari 5.1
            // errors if we try to read this.xhr.status from that handler
            // preventing us from detecting e.g. a 404
            // so we just assume that an upload that completes in 200
            // successfully uploaded all of the bytes in a file.
            // I hope that's a safe assumption(?).
            this.cur_file_bytes_total = bytes_total || null;

            if(this.on_upload_file_progress) {
                var file = this.files_to_upload[this.cur_file_index];

                this.on_upload_file_progress(file, bytes_received, bytes_total);
            }

        };

        this.ready_state_change = function(e) {
            if(this.xhr.readyState == 4) {
                if(this.xhr.status != 200) {
                    this.upload_error(e);
                } else {
                    this.upload_completed(e);
                }
            }
        };

        this.upload_completed = function(e) {
                
            var file = this.files_to_upload[this.cur_file_index];

            if(this.on_upload_file_complete) {

                this.on_upload_file_complete(file, this.cur_file_bytes_total);
            }

            this.uploaded_files.push(file);
            this.cur_file_index += 1;            
            this.upload_next_file();

        };

        this.receive_files = function(files) {
            if(this.on_receive_begin) {
                this.on_receive_begin(files);
            }
            this.files = files;
            this.cur_file_index = 0;
            this.received_files = [];
            this.receive_next_file();
        };


        this.receive_next_file = function() {

            var got_file = false;
            while(!got_file) {

                if(this.cur_file_index > (this.files.length - 1)) {
                    if(this.received_files.length <= 0) {
                        this.on_receive_completed([]);
                        return false;
                    }

                    if(this.on_receive_completed) {                        
                        this.on_receive_completed(this.received_files);
                    }
                    
                    if(this.p.upload_files) {
                        this.start_upload();
                    } else {
                        if(this.p.hover_class) {
                            Element.removeClassName(this.node_id, this.p.hover_class);
                        }
                    }
                    return true;
                }

                var file = this.files[this.cur_file_index];
                var msg = this.filter(file);
                if(msg) {
                    this.cur_file_index += 1;
                } else {
                    got_file = true;
                    this.receive_file(file);
                }
            }
        };

        this.receive_file = function(file) {
            
            if(!file.file) {
                alert("Error: file has no .file");
                return false;
            }

            if(this.on_receive_file_begin) {
                this.on_receive_file_begin(file);
            }

            this.reader = new FileReader();
            this.reader.onload = this.on_file_received.bindAsEventListener(this);
            this.reader.onprogress = this.reader_progress.bindAsEventListener(this);
            this.reader.onerror = this.reader_error.bindAsEventListener(this);
            this.reader.readAsBinaryString(file.file);

        };

        this.handle_zip_file = function(file) {
            var unzipper = new JSUnzip(file.data);
            unzipper.readEntries();

            var i, entry, subfile;
            var data = null;
            for(i=0; i < unzipper.entries.length; i++) {
                entry = unzipper.entries[i];


                // is the entry compressed?
                //   1 means uncompressed
                //   undefined means it is a zip file (also uncompressed)
                if(entry.compressionMethod && (entry.compressionMethod != 1)) {
                    // 
                    if(entry.compressionMethod == 8) {
                        if(!JSInflate) {
                            if(this.on_decompression_error) {
                                subfile = this.to_standard_file(entry, null, file);
                                this.on_decompression_error(subfile, "File compression method is DEFLATE, but JSInflate library was not detected.");
                                return false;
                            }
                        } else {
                            data = JSInflate.inflate(entry.data);
                        }
                    } else {
                        // unknown decompression format
                        if(this.on_decompression_error) {
                            subfile = this.to_standard_file(entry, null, file);
                            this.on_decompression_error(subfile, "File compression method is unknown (compressionMethod field says '" + this.compressionMethod + "'.");
                            return false;
                        }
                    }
                }

                subfile = this.to_standard_file(entry, data, file);

                if(!this.filter(subfile)) {
                    this.file_received(subfile);
                }
            }
        };

        this.is_archive = function(file) {
            var i, mime;
            if(file.name.match(/\.zip$/i)) {
                return true;
            }
            for(i=0; i < this.archive_mime_types.length; i++) {
                mime = this.archive_mime_types[i];
                if(file.type.toLowerCase().match(mime)) {
                    return true;
                }
            }
            return false;
        };

        this.on_file_received = function(e) {
            var file = this.files[this.cur_file_index];
            file.data = e.target.result;
            this.file_received(file);
        };

        this.file_received = function(file) {

            if(this.on_receive_file_completed) {
                this.on_receive_file_completed(file);
            }

            if(this.is_archive(file) && this.p.client_side_zip) {
                this.handle_zip_file(file);
            } else {
                this.received_files.push(file);
            }
            
            // files from archive aren't really
            // one of the received files 
            // (they're not in the array of files)
            if(!file.parent_archive) {
                this.cur_file_index += 1;
                this.receive_next_file();
            }
        };

        this.reader_progress = function(e) {
            if(e.lengthComputable) {
                var file = this.files[this.cur_file_index];
                if(this.on_receive_file_progress) {
                    this.on_receive_file_progress(file, e.loaded, e.total);
                }
            }
        };

        this.reader_error = function(e) {
            if(e.target.error.code == e.target.error.NOT_FOUND_ERR) {
                alert("Error reading file: File not found!");
            }
            return false;
        };

        this.init();
    } // end Handler
} // end FileDrop
