YUI.add('moodle-block_css_theme_tool-base', function(Y) {

var CSSTHEMETOOL = function(config) {
    CSSTHEMETOOL.superclass.constructor.apply(this, arguments);
}
CSSTHEMETOOL.prototype = {
    /**
     * A <style> tag that gets inserted into the head. This is how
     * we can show our live changes
     * @var {Y.Node}
     */
    styletag : null,
    /**
     * Preview stylesheet tag as above
     * @var {Y.Node}
     */
    previewtag : null,
    /**
     * An array containing rule objects
     * @var {array}
     */
    rules : [],
    /**
     * Tracks whether the user has been informed about the how deleting
     * rules work, and that you need to save
     * @var {bool}
     */
    explaineddelete : false,
    /**
     * Stores the configuration settings for this instance
     * @var {object}
     */
    cfg : {
        /**
         * The current users id
         * @var {int}
         */
        userid : 0,
        /**
         * Set to true if you want the selector to display all options
         * for the body tag. Defaults to false
         * @var {bool}
         */
        showadvancedbodytags : false,
        /**
         * Set to true to automatically save all changes
         * @var {bool}
         */
        autosaveonchange : true,
        /**
         * If set only the current users rules are viewed
         * @var {bool}
         */
        onlyviewmyrules : false
    },
    /**
     * Stores useful nodes to the tool
     * @var {object}
     */
    nodes : {
        /**
         * The save button in the block
         * @var {Y.Node}
         */
        savechangesbutton : null
    },
    /**
     * Stores component instances
     * @var {object}
     */
    components : {
        /**
         * An instance of the CSS builder
         * @var {M.block_css_theme_tool.css_builder}
         */
        cssbuilder : null,
        /**
         * An instance of the CSS viewer
         * @var {M.block_css_theme_tool.css_viewer}
         */
        cssviewer : null,
        /**
         * An instance of the settings manager
         * @var {M.block_css_theme_tool.settings_manager}
         */
        settingsmanager : null
    },
    initializer : function(config) {

        if (config.settings.userid) this.cfg.userid = config.settings.userid;
        if (config.settings.fullbodytags) this.cfg.showadvancedbodytags = config.settings.fullbodytags;
        if (config.settings.autosaveonchange) this.cfg.autosaveonchange = config.settings.autosaveonchange;
        if (config.settings.onlyviewmyrules) this.cfg.onlyviewmyrules = config.settings.onlyviewmyrules;

        this.publish('cssthemetool:changed');           // Publish the changed event

        // Make sure all existing rules are moved into this instance
        for (var i in config.css) {
            var rule = config.css[i];
            var rulestyles = [];
            for (var j in rule.styles) {
                if (/[^;]$/.test(rule.styles[j].value)) {
                    rule.styles[j].value += ';';
                }
                rulestyles.push(rule.styles[j].name+': '+rule.styles[j].value);
            }
            this.rules.push({selector:rule.selector,styles:rulestyles,user:rule.userid});
        }

        // Prepare the CSS builder for instantiation
        this.prepare_component_use(Y.one('.block_css_theme_tool input.addrulebutton').removeAttribute('disabled'), 'cssbuilder', {});
        // Prepare the CSS viewer for instantiation
        this.prepare_component_use(Y.one('.block_css_theme_tool input.viewcssbutton').removeAttribute('disabled'), 'cssviewer', {});
        // Prepare the settings dialogue for instantiation
        this.prepare_component_use(Y.one('.block_css_theme_tool input.settingsbutton').removeAttribute('disabled'), 'settings', {});

        // Create the style tage and add it to the head of the document
        this.styletag = Y.Node.create('<style type="text/css"></style>');
        this.previewtag = Y.Node.create('<style type="text/css"></style>');
        Y.one(document.body).append(this.styletag).append(this.previewtag);

        // Process all rules... adds them to the stylesheet we just created
        this.process_rules_to_stylesheet();

        // Remove the existing css page if it was already added.
        if (M.block_css_theme_tool.existingstylesheet) {
            M.block_css_theme_tool.existingstylesheet.remove();
        } else {
            // Remove the link to the tools styles.php page otherwise we
            // won't see rule deletions of modifications!
            Y.all('link').each(function(link){
                if (link.getAttribute('rel')=='stylesheet' && link.getAttribute('href').match(/block_css_theme_tool/) && link.getAttribute('href').match(/pluginfile\.php/)) {
                    link.remove();
                }
            }, this);
        }

        // Fetch and store the save button from the block
        this.nodes.savechangesbutton = Y.one('.block_css_theme_tool input.savechangesbutton');
        // Attach the save_rules event to the buttons click
        this.nodes.savechangesbutton.on('click', this.save_rules, this);
        // Hide the savechangesbutton if things get automatically saved
        if (this.cfg.autosaveonchange) {
            this.nodes.savechangesbutton.addClass('autosaveenabled');
        }
        // On a change event for the tool re-enable the button
        this.on('cssthemetool:changed', function(e){
            this.nodes.savechangesbutton.removeAttribute('disabled');
            // Auto save the change if required
            if (this.cfg.autosaveonchange) {
                this.save_rules();
            }
        }, this);
    },
    prepare_component_use : function(el, name, args) {
        this.components[name] = el.on('click', function(e){
            e.halt();
            this.components[name].detach();
            args.e = e;
            args.el = el;
            args.cssthemetool = this;
            Y.use('moodle-block_css_theme_tool-'+name, function(Y) {
                args.cssthemetool.components[name] = M.block_css_theme_tool['init_'+name].apply(M.block_css_theme_tool, [args]);
            });
        }, this);
    },
    /**
     * Adds a CSS rule
     * @param {string} selector
     * @param {array} styles
     * @return {bool}
     */
    add_rule : function(selector, styles) {
        var added = false;
        for (var i in this.rules) {
            if (this.rules[i].selector == selector) {
                this.rules[i] = {selector:selector,styles:styles};
                added = true;
                break;
            }
        }
        if (!added) {
            this.rules.push({selector:selector,styles:styles});
        }
        this.fire('cssthemetool:changed');
        return this.process_rules_to_stylesheet();
    },
    /**
     * Gets a rule object given a selector
     * @param {string} selector
     * @return {bool}
     */
    get_rule : function(selector) {
        // Trim the selector first up
        selector = selector.replace(/^\s+|\s+$/g,'');
        for (var i in this.rules) {
            // Compare each rule
            var ruleselector = this.rules[i].selector.replace(/^\s+|\s+$/g,'');
            if (ruleselector == selector) {
                // Return the located rule
                return this.rules[i];
            }
        }
        // Return false by default
        return false;
    },
    /**
     * Deletes the rule with the given selector
     * @param {string} selector
     * @return {bool}
     */
    delete_rule : function(selector) {
        selector = selector.replace(/^\s+|\s+$/g,'');
        for (var i in this.rules) {
            var ruleselector = this.rules[i].selector.replace(/^\s+|\s+$/g,'');
            if (ruleselector == selector) {
                delete this.rules[i];
                this.process_rules_to_stylesheet();
                if (!this.explaineddelete && !this.cfg.autosaveonchange) {
                    alert(M.str.block_css_theme_tool.savenotification);
                    this.explaineddelete = true;
                }
                this.fire('cssthemetool:changed');
                return true;
            }
        }
        return false;
    },
    /**
     * Edits the rule with the given selector
     * @param {string} selector
     */
    edit_rule : function(selector) {
        selector = selector.replace(/^\s+|\s+$/g,'');
        var target = Y.one(selector);
        if (target) {
            this.components.cssbuilder.show(target, selector);
        } else {
            alert(M.str.block_css_theme_tool.cannotfindnode);
        }
    },
    /**
     * Saves all of the rules to the database
     */
    save_rules : function() {
        var data = [];
        data.push('action=save');
        data.push('sesskey='+M.cfg.sesskey);
        for (var i in this.rules) {
            var rule = this.rules[i];
            data.push('rules['+i+']='+encodeURIComponent(rule.selector));
            data.push('styles['+i+']='+encodeURIComponent(rule.styles.join('@@@')));
        }
        this.nodes.savechangesbutton.setAttribute('disabled', true);
        Y.io(M.cfg.wwwroot+'/blocks/css_theme_tool/ajax.php', {
            method : 'POST',
            data : data.join('&'),
            on: {
                complete:this.save_rules_callback
            },
            context:this
        });
    },
    /**
     * Callback for the save_rules method could be made to do something
     * usefull.
     * @param {int} transactionid
     * @param {object} outcome
     * @param {mixed} args
     */
    save_rules_callback : function(transactionid, outcome, args) {
        //alert(transactionid+"\n"+outcome.responseText);
    },
    /**
     * Purges all rules, deleting them from the database
     */
    purge_rules : function() {
        // Confirm the action before taking it
        if (confirm(M.str.block_css_theme_tool.purgerulesconfirm)) {
            // Fire an ajax request to purge the rules from the database
            Y.io(M.cfg.wwwroot+'/blocks/css_theme_tool/ajax.php', {
                method : 'POST',
                data : 'action=purge&sesskey='+M.cfg.sesskey,
                on: {
                    complete:function(){
                        this.rules = [];
                        this.process_rules_to_stylesheet();
                        alert(M.str.block_css_theme_tool.purgerulescomplete);
                    }
                },
                context:this
            });
        }
    },
    /**
     * Adds each rule to the stylesheet for a visable result
     * @return {bool}
     */
    process_rules_to_stylesheet : function() {
        var rules = [];
        for (var i in this.rules) {
            if (this.cfg.onlyviewmyrules && this.rules[i].user && this.rules[i].user != this.cfg.userid) {
                continue;
            }
            rules.push(this.rules[i].selector+' {'+this.rules[i].styles.join('')+'}');
        }
        this.styletag.set('innerHTML', rules.join("\n"));
        return true;
    },
    /**
     * Hides all of the compontents
     */
    hide_components : function() {
        for (var i in this.components) {
            if (this.components[i] && (typeof this.components[i].hide !== 'undefined')) {
                this.components[i].hide();
            }
        }
    },
    /**
     * Exports a CSS file
     */
    export_css : function() {
        Y.io(M.cfg.wwwroot+'/blocks/css_theme_tool/ajax.php', {
            method : 'POST',
            data : 'id='+this.get('instanceid')+'&action=exportcss&sesskey='+M.cfg.sesskey,
            on: {
                complete:function(transactionid, outcome, args){
                    var popup = window.open(outcome.responseText, 'csstoolexport');
                    if (!popup) {
                        alert('Popups must be allowed for this site in order for export to work');
                    }
                }
            },
            context:this
        });
    }
}
Y.extend(CSSTHEMETOOL, Y.Base, CSSTHEMETOOL.prototype, {
    NAME : 'css_theme_tool',
    ATTRS : {
        instanceid : {}
    }
});
Y.augment(CSSTHEMETOOL, Y.EventTarget);

M.block_css_theme_tool = {
    instance : null,
    init : function(config) {
        this.instance = new CSSTHEMETOOL(config);
    },
    init_css_by_js : function(Y, url) {
        this.existingstylesheet = Y.Node.create('<link type="text/css" rel="stylesheet" href="'+url+'"></link>');
        Y.one('head').append(this.existingstylesheet);
    }
}

}, '@VERSION@', {requires:['node', 'event', 'event-key', 'event-mouseenter', 'io']});