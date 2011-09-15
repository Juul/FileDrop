/*

  TODO

  Implement API.

  Use FormData method as shown here:
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

        // Check browser support and sanity of parameters

        if(!this.support()) {
            alert(this.name + " is not supported by this browser");
            return false;
        } else {
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

        this.init = function() {

            this.parent = parent;
            this.node_id = node_id;

            this.p = Object.extend({
                url: null, // url for file upload
                read_files: this.parent.readSupport(), // read files into browser memory before uploading
                upload_files: this.parent.uploadSupport() // upload files when dropped
            }, p);

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

        this.show = function(msg) {
            if(!$(this.title_node_id) ||
               !$(this.subtitle_node_id) ||
               (msg.length != 2)) {
                return false;
            }
            $(this.title_node_id).innerHTML = msg[0];
            $(this.subtitle_node_id).innerHTML = msg[1];
            return true;
        };

        this.nop = function(e) {
            e.stopPropagation();
            e.preventDefault();
        };

        this.on_enter = function(e) {
            Element.addClassName(this.node_id, 'filedrop_over');
            this.show(["I see your files :)", "Now let them drop!"]);
            this.nop(e);
        };


        this.on_exit = function(e) {
            Element.removeClassName(this.node_id, 'filedrop_over');
            this.show(this.default_msg);
            this.nop(e);
        };

        this.on_over = function(e) {
            this.nop(e);
        };

        
        this.on_drop = function(e) {
            this.nop(e);
            
            var files = e.dataTransfer.files;
            
            if(files.length < 1) {
                return false;
            }

            if(this.p.read_files) {
                this.receive_files(files);
            } else if(this.p.upload_files) {
                this.start_upload(files);
            }
        };
        
        this.status_add_filtered = function(label) {
            $(this.subtitle_node_id).innerHTML += "<p>Skipped: "+label+"</p>";
        };

        this.status_add_uploadbar = function(label) {
            $(this.subtitle_node_id).innerHTML += "<p>Reading: "+label+"</p>";
        };

        this.filter = function(file) {
            var filter = true;
            var i, rule, ok;

            var file_type = file.type.toLowerCase();
            var file_name = file.name.toLowerCase();


            if(this.p.allow) {
                for(i=0; i < this.p.allow.length; i++) {
                    filter = true;
                    rule = this.p.allow[i];
                    if(rule.mime_type) {
                        if(file_type.match(rule.mime_type.toLowerCase())) {
                            filter = false;
                        }
                    }
                    if(rule.extension) {
                        if(file_name.match(rule.extension.toLowerCase())) {
                            filter = false;
                        } else {
                            filter = true;
                        }
                    }
                }
            } else if(this.p.disallow) {
                for(i=0; i < this.p.disallow.length; i++) {
                    filter = false;
                    rule = this.p.disallow[i];
                    if(rule.mime_type) {
                        if(file_type.match(rule.mime_type.toLowerCase())) {
                            filter = true;
                        }
                    }
                    if(rule.extension) {
                        if(file_name.match(rule.extension.toLowerCase())) {
                            filter = true;
                        } else {
                            filter = false;
                        }
                    }
                }
            } else {
                return false;
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
            this.uploaded_files = [];
            this.upload_next_file();
        };

        this.all_uploads_completed = function() {
            this.show(['Upload complete!', this.uploaded_files.length+' files were uploaded.'])
        };

        this.upload_next_file = function() {

            if(this.cur_file_index >= this.files_to_upload.length) {
                if(this.uploaded_files.length <= 0) {
                    this.show(['Error!', 'No files were uploaded.']);
                    return false;
                }
                this.all_uploads_completed();
                return true;
            }

            // if the list of files wasn't filtered in receive,
            // filter now
            var obj = null;
            if(!this.p.read_files) {
                var msg;
                while(!obj) {
                    obj = this.files_to_upload[this.cur_file_index];
                    msg = this.filter(obj);

                    if(msg) {
                        this.status_add_filtered(msg);
                        this.cur_file_index += 1;
                        obj = null;
                    }
                }
            } else {
                obj = this.files_to_upload[this.cur_file_index];
            }

            var file = null;
            var file_result = null;

            // if these are received files and their results
            if(obj.file && obj.result) {
                file = obj.file;
                file_result = obj.result;
            } else { // if these files have not been received
                file = obj;
            }

            this.xhr_upload(file, file_result);
        };

        this.xhr_upload = function(file, file_result) {

            this.xhr = new XMLHttpRequest();

            this.xhr.upload.addEventListener('progress', 
                                             this.upload_progress.bindAsEventListener(this),
                                            false);

            this.xhr.upload.addEventListener('error',
                                             this.upload_error.bindAsEventListener(this),
                                             false);

            this.xhr.upload.addEventListener('abort',
                                             this.upload_aborted.bindAsEventListener(this),
                                             false);

            this.xhr.onreadystatechange = this.ready_state_change.bindAsEventListener(this);

            var bound = '';
            var i;
            for(i=0;i < 3; i++) {
                bound += Math.floor(Math.random()*32768);
            }

            /* TODO

               Add functions for extra parameters when uploading

             */

            var content_type = 'multipart/form-data; boundary='+bound;

            var request = '--' + bound + "\r\n";

            request += 'Content-Disposition: form-data; ';
            request += 'name="' + 'file[file]' + '"; ';
            request += 'filename="' + file.name + '"' + "\r\n"

            request += "Content-Type: application/octet-stream" + "\r\n\r\n";
            if(file_result) {
                request += file_result + "\r\n";
            } else {
                request += file.value;
            }
            request+= "--" + bound + "--\r\n";

            this.xhr.open('POST', this.p.url);
            this.xhr.setRequestHeader('Content-Type', content_type);

            this.xhr.send(request);


        };

        this.upload_error = function(e) {
            // TODO proper error handling
            if(this.xhr.status != 200) {
                alert('Upload failed with http status code '+this.xhr.status+".\n\nServer said:\n\n" + this.xhr.responseText);
            } else {
                alert('unknown upload error!');
            }
        };

        this.upload_aborted = function(e) {
            // TODO proper abort handling
            alert('upload aborted!');
        };
        
        this.upload_progress = function(e) {
            
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
                
            this.uploaded_files.push(this.files_to_upload[this.cur_file_index]);
            this.cur_file_index += 1;            
            this.upload_next_file();

        };

        this.receive_files = function(files) {
            this.show(["Reading", files.length + " files"]);
            this.files = files;
            this.cur_file_index = 0;
            this.received_files = [];
            this.receive_next_file();
        };


        this.no_files_received = function() {
            this.show(["No files uploaded!",
                       "None of the dropped files were accepted."])
        };


        this.receive_next_file = function() {

            var got_file = false;
            while(!got_file) {

                if(this.cur_file_index > (this.files.length - 1)) {
                    if(this.received_files.length <= 0) {
                        this.no_files_received();
                        return false;
                    }
                    
                    if(this.p.upload_files) {
                        this.start_upload();
                    }
                    return true;
                }

                var file = this.files[this.cur_file_index];
                var msg = this.filter(file);
                if(msg) {
                    this.status_add_filtered(msg);
                    this.cur_file_index += 1;
                } else {
                    got_file = true;
                    this.receive_file(file);
                }
            }
        };

        this.receive_file = function(file) {
            
//            alert('receiving file: ' + file.name);

            this.status_add_uploadbar(file.name);

            this.reader = new FileReader();
            this.reader.onload = this.file_received.bindAsEventListener(this);
            this.reader.onprogress = this.reader_progress.bindAsEventListener(this);
            this.reader.onerror = this.reader_error.bindAsEventListener(this);
            this.reader.readAsBinaryString(file);

        };

        this.file_received = function(e) {
          
//            alert("file read!");

            this.received_files.push({
                file: this.files[this.cur_file_index],
                result: e.target.result
            });
//            alert('received: ' + this.files[this.cur_file_index].name);

            this.cur_file_index += 1;
            this.receive_next_file();
        };
        
        this.reader_progress = function(e) {
            if(e.lengthComputable) {

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
