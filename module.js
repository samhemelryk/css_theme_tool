/**
 * CSS theme tool JavaScript module
 *
 * This JavaScript file contains all of the client side logic for the CSS theme
 * tool. Of course as this block relies 100% on JavaScript is it relativiliy advanced.
 * It requires YUI 3.1.0 which is the default being shipped with Moodle 2.0 as of
 * its beta period.
 * 
 * @package   blocks
 * @subpackage css_theme_tool
 * @copyright 2010 Sam Hemelryk <sam.hemelryk@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Namespace for the CSS theme tool
 */
M.block_css_theme_tool = {
    /**
     * The currently active instance of the CSS theme tool
     * @var {css_theme_tool}
     */
    instance : null,
    existingstylesheet : null,
    previouscolours : [],
    /**
     * @param {YUI} Y A yui instance to use
     * @param {int} instanceid Instance ID
     * @param {array} existingrules An array of existing rule objects
     * @param {object} settings A settings object
     */
    init : function(Y, instanceid, existingrules, settings) {
        // Load the required YUI modules into the Y object for use here
        Y.use('node','overlay', 'event', 'event-key', 'event-mouseenter', 'io', 'cookie', function() {
            // The CSS theme tool object
            // Associates itself with the CSS theme tool block
            var css_theme_tool = {
                /**
                 * Used by all components to display their content nicely
                 * @var {YUI.Overlay}
                 */
                overlay : null,
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
                 * The block instance ID
                 * @var {int}
                 */
                instanceid : instanceid,
                /**
                 * Stores the configuration settings for this instance
                 * @var {object}
                 */
                cfg : {
                    /**
                     * The current users id
                     * @var {int}
                     */
                    userid : settings.userid | 0,
                    /**
                     * Set to true if you want the selector to display all options
                     * for the body tag. Defaults to false
                     * @var {bool}
                     */
                    showadvancedbodytags : settings.fullbodytags | false,
                    /**
                     * Set to true to automatically save all changes
                     * @var {bool}
                     */
                    autosaveonchange : settings.autosaveonchange | true,
                    /**
                     * If set only the current users rules are viewed
                     * @var {bool}
                     */
                    onlyviewmyrules : settings.onlyviewmyrules | false
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
                /**
                 * Initliases the CSS theme tool
                 */
                init : function() {

                    var bd = Y.one(document.body);

                    this.publish('cssthemetool:changed');           // Publish the changed event

                    var winheight = bd.get('winHeight');
                    // Instantiate the overlay
                    this.overlay = new Y.Overlay({
                        bodyContent : 'temp',
                        width: '80%',
                        height : Math.floor(winheight*0.8),
                        visible : false,
                        zIndex : 500,
                        id : 'css_theme_tool'
                    });
                    // Render it on the body (less chance of clipping)
                    this.overlay.render(bd);
                    Y.one('#css_theme_tool').setStyle('position', 'fixed').setStyle('margin', Math.floor(winheight*0.1)+'px 10%');
                    Y.on('windowresize', function(e){
                        var winheight = bd.get('winHeight');
                        this.overlay.set('height', Math.floor(winheight*0.8));
                        Y.one('#css_theme_tool').setStyle('marginTop', Math.floor(winheight*0.1));
                    }, this);
                    // Add our custom class
                    this.overlay.bodyNode.addClass('css_builder_overlay');

                    // Make sure all existing rules are moved into this instance
                    for (var i in existingrules) {
                        var rule = existingrules[i];
                        var rulestyles = [];
                        for (var j in rule.styles) {
                            if (/[^;]$/.test(rule.styles[j].value)) {
                                rule.styles[j].value += ';';
                            }
                            rulestyles.push(rule.styles[j].name+': '+rule.styles[j].value);
                        }
                        this.rules.push({selector:rule.selector,styles:rulestyles,user:rule.userid});
                    }
                    // Instantiate the CSS builder
                    this.components.cssbuilder = new M.block_css_theme_tool.css_builder(Y, this);
                    // Instantiate the CSS viewer
                    this.components.cssviewer = new M.block_css_theme_tool.css_viewer(Y, this);
                    // Instantiate the settings manager
                    this.components.settingsmanager = new M.block_css_theme_tool.settings_manager(Y, this);

                    // Create the style tage and add it to the head of the document
                    this.styletag = Y.Node.create('<style type="text/css"></style>');
                    this.previewtag = Y.Node.create('<style type="text/css"></style>');
                    bd.append(this.styletag).append(this.previewtag);

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
                    // On a change event for the tool re-enable the button
                    this.on('cssthemetool:changed', function(e){
                        this.nodes.savechangesbutton.removeAttribute('disabled');
                        // Auto save the change if required
                        if (this.cfg.autosaveonchange) {
                            this.save_rules();
                        }
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
                        this.components[i].hide();
                    }
                },
                /**
                 * Exports a CSS file
                 */
                export_css : function() {
                    Y.io(M.cfg.wwwroot+'/blocks/css_theme_tool/ajax.php', {
                        method : 'POST',
                        data : 'id='+this.instanceid+'&action=exportcss&sesskey='+M.cfg.sesskey,
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
            // Give the css_theme_tool the power of the Y.EventTarget
            Y.augment(css_theme_tool, Y.EventTarget);
            // Initliase the tool!
            css_theme_tool.init();
            // and store it just incase
            M.block_css_theme_tool.instance = css_theme_tool;
        });
    },

    init_css_by_js : function(Y, url) {
        this.existingstylesheet = Y.Node.create('<link type="text/css" rel="stylesheet" href="'+url+'"></link>');
        Y.one('head').append(this.existingstylesheet);
    }
}
/**
 * CSS theme tool component that allows you to view the CSS you have created.
 *
 * This component also provides hooks to edit and delete CSS rules you have created.
 *
 * @class
 * @constructor
 * @param {YUI} Y
 * @param {css_theme_tool} themetool
 */
M.block_css_theme_tool.css_viewer = function(Y, themetool) {
    this.Y = Y;
    this.themetool = themetool;
    // Attach the event to display the CSS
    Y.one('.block_css_theme_tool input.viewcssbutton').removeAttribute('disabled').on('click', this.show, this);
}
/**
 * Properties of css_viewer
 */
M.block_css_theme_tool.css_viewer.prototype = {
    /**
     * The YUI instance to use with this block
     * @var {YUI}
     */
    Y : null,
    /**
     * The themetool instance this component belongs to.
     * @var {css_theme_tool}
     */
    themetool : null,
    /**
     * True if the component is being shown
     * @var {bool}
     */
    shown : false,
    /**
     * The event for closing the overlay
     * @var {Y.Event}
     */
    eventcloseoverlay : null,
    /**
     * Shows the CSS viewer component
     */
    show : function () {
        // First hide all other components (they may be using the dialogue)
        this.themetool.hide_components();
        // Create the content div for the CSS viewer
        var content = this.Y.Node.create('<div class="viewcssbox"></div>');
        for (var i in this.themetool.rules) {
            // Create the HTML for each rule so we can show it
            var r = this.themetool.rules[i];
            var selector = this.Y.Node.create('<div class="cssrule"></div>');
            var editicon = this.Y.Node.create('<img src="'+M.util.image_url('t/edit', 'moodle')+'" alt="edit" style="width:11px;height:11px;" class="icon" />');
            var deleteicon = this.Y.Node.create('<img src="'+M.util.image_url('t/delete', 'moodle')+'" alt="delete" style="width:11px;height:11px;" class="icon" />');
            selector.append(editicon);
            selector.append(deleteicon);
            selector.append(this.Y.Node.create('<span class="selector">'+r.selector+'</span> {'+r.styles.join('')+'}'));
            // Add it to the content div
            content.append(selector);
            // Attach the edit event
            editicon.on('click', this.edit_rule, this, r);
            // Attach the delete event
            deleteicon.on('click', this.delete_rule, this, r);
        }
        // Setup the theme tools overlays as we require
        this.themetool.overlay.set('bodyContent', content);
        this.themetool.overlay.show();
        // Attach the close event to a click anywhere on the overlay
        this.eventcloseoverlay = this.themetool.overlay.bodyNode.on('click', this.hide, this);
        this.shown = true;
    },
    /**
     * Hides the CSS viewer component if it is being shown
     */
    hide : function () {
        if (this.shown) {
            this.eventcloseoverlay.detach();
            this.themetool.overlay.hide();
            this.shown = false;
        }
    },
    /**
     * Sets up to edit the selected rule
     *
     * @param {Y.Event} e
     * @param {object} rule
     */
    edit_rule : function(e, rule) {
        this.themetool.edit_rule(rule.selector);
    },
    /**
     * Sets up to delete the selected rule
     * 
     * @param {Y.Event} e
     * @param {object} rule
     */
    delete_rule : function(e, rule) {
        this.themetool.delete_rule(rule.selector);
    }
}
/**
 * CSS builder component
 *
 * This component is the core component in the CSS theme tool.
 * It allows the user to add rules by clicking on an element, and provides a nice
 * interface for creating rules.
 *
 * @class
 * @constructor
 * @param {YUI} Y
 * @param {css_theme_tool} themetool
 */
M.block_css_theme_tool.css_builder = function(Y, themetool) {
    // Store the arguments
    this.Y = Y;
    this.themetool = themetool;
    // Create the mask. This will be used to capture click events
    this.mask = new this.Y.Overlay({
        bodyContent : ' ',
        width: '100%',
        height: '100%',
        visible : false,
        xy : [0,0]
    });
    // Render it to the body, it needs to be here to avoid clipping rules
    this.mask.render(this.Y.one(document.body));
    // Prepare the overlay div as a modal
    var modal = this.mask.bodyNode.ancestor('.yui3-overlay');
    if (modal) {
        // Has to be completely inivisble
        modal.setStyle('opacity', '0.0');
        // Crosshair makes it obvious whats going on
        modal.setStyle('cursor', 'crosshair');
        // Has to be fixed we don't want it to move or grow
        modal.setStyle('position', 'fixed');
    }
    // Generate the core content to increase reponse time during mouse events and
    // display calls
    this.init_generate_controls();
    // Enable the addrule button and attach the click event
    this.Y.one('.block_css_theme_tool input.addrulebutton').removeAttribute('disabled').on('click', this.capture_next_click, this)
}
/**
 * Properties for the css builder
 */
M.block_css_theme_tool.css_builder.prototype = {
    /**
     * The YUI instance for this tool
     * @var {YUI}
     */
    Y : null,
    /**
     * True is the component is being shown
     * @var {bool}
     */
    shown : false,
    /**
     * The CSS theme tool this component belong too
     * @var css_theme_tool
     */
    themetool : null,
    /**
     * The mask overlay to capture mouse events
     * @var {Y.Overlay}
     */
    mask : null,
    /**
     * An array of classes not to select by default.... this list will grow
     * @var {array}
     */
    nondefaultclasses : ['region-content','yui3-js-enabled'],
    /**
     * The number of selectors currently being shown
     * @var {int}
     */
    selectorcount : 0,
    /**
     * The mouse move event reference when in use
     * @var {Y.Event}
     */
    eventmousemove : null,
    /**
     * The mouse capture click reference when in use
     * @var {Y.Event}
     */
    eventcaptureclick : null,
    /**
     * The node that contains all of the controls for this component... a buffer really.
     * @var {Y.Node}
     */
    controlsnode : null,
    /**
     * An array of components currently initialised
     */
    components : [],
    /**
     * When called this sets the component up to capture the next click to add a rule
     */
    capture_next_click : function() {
        // Hide all components, I don't want people to style them ;)
        this.themetool.hide_components();
        // Show the mask
        this.mask.show();
        // Capture all body clicks
        this.eventcaptureclick = this.mask.bodyNode.on('click', this.capture_click, this);
        // Create a set of divs to highlight the element under the mouse
        var div = this.Y.one('#mousemovetrackdiv') || (function(Y){
            var div = Y.Node.create('<div id="mousemovetrackdiv"><div class="top"></div><div class="bottom"></div><div class="left"></div><div class="right"></div></div>');
            div.setStyle('opacity', 0.4);
            Y.one(document.body).append(div);
            return div;
        })(this.Y);
        div.setStyle('visibility', 'visible');
        // Attach the highlight event
        this.eventmousemove = this.Y.one(document.body).on('mousemove', this.highlight_cell_below_event, this, div);
    },
    /**
     * Captures a click and allows the user to add a rule for the element they clicked on
     * @param {Y.Event} e
     */
    capture_click : function(e) {
        // Stop the event immediatly!
        e.halt();
        // Detach the mouse move event its no longer needed
        this.eventmousemove.detach();
        // Detach the capture click event we're doing that now
        this.eventcaptureclick.detach();
        // Hide the highlight divs
        this.Y.one('#mousemovetrackdiv').setStyle('visibility', 'hidden');
        // Hide the mask
        this.mask.hide();
        try {
            // Attempt to get the element that exists below the click event
            var target = this.Y.one(document.elementFromPoint(e.clientX, e.clientY));
        } catch (ex) {
            // Can't capture the event... please upgrade to a real browser!
            alert(M.str.block_css_theme_tool.errorcapturingclick+ex.message);
            return;
        }
        this.show(target);
    },
    /**
     * Highlights the cell below the mouse
     * @param {Y.Event} e
     * @param {Y.Node} div
     */
    highlight_cell_below_event : function(e, div) {
        // Hide the mask so we don't get this node back
        this.mask.hide();
        // Hide the divs so we don't get this node back
        div.setStyle('visibility', 'hidden');
        // Get the event below the click
        var target = this.Y.one(document.elementFromPoint(e.clientX, e.clientY));
        // Show the divs again
        div.setStyle('visibility', 'visible');
        // Show the mask again
        this.mask.show();
        // Get the position of the target node
        var pos = target.getXY();
        // Get the scroll position .... grr
        var scrollY = this.Y.get('window').get('scrollY');
        // Get the window width and hieght
        var winpos = [this.Y.get(document.body).get('winWidth'), this.Y.get(document.body).get('winHeight')];
        // Change the highlight div dimensions to highlight the node being hovered over
        div.one('.top').setStyle('height', (pos[1]-scrollY)+'px');
        div.one('.left').setStyle('width', pos[0]+'px');
        div.one('.bottom').setStyle('height', (winpos[1]-pos[1]-target.get('offsetHeight')+scrollY)+'px');
        div.one('.right').setStyle('width', (winpos[0]-pos[0]-target.get('offsetWidth'))+'px');
    },
    /**
     * Highlights all of the cells that the current rule selector is going to be
     * applied to.
     * @param {Y.Event} e
     */
    highlight_affected_cells : function(e) {
        // Create a div to contain all highlight divs
        var container = this.Y.Node.create('<div class="cssbuilder_highlight_container"></div>');
        // Attach it to the body to avoid clipping
        this.Y.one(document.body).append(container);
        // Add a body watch to make the highlighting obvious
        container.append(this.Y.Node.create('<div class="cssbuilder_bodywash"></div>'));

        // For each node found by the selector create a div that has the same position
        // and dimensions as the located node. Add it to the highlight container.
        // This new div is the highlight!
        this.Y.all(this.get_selected_selector()).each(function(node){
            var highlight = this.Y.Node.create('<div class="cssbuilder_cellhighlight"></div>');
            highlight.setXY(node.getXY());
            highlight.setStyle('position', 'absolute');
            highlight.setStyle('width', node.get('offsetWidth')+'px');
            highlight.setStyle('height', node.get('offsetHeight')+'px');
            highlight.setStyle('opacity', 0.9);
            container.append(highlight);
        }, this);
    },
    /**
     * Previews the style created so far within the page
     *
     * @param {Y.Event} e
     */
    preview_affected_cells : function(e) {
        if (this.Y.one('#nextstyleinput')) {
            this.process_style(null, this.Y.one('#nextstyleinput'), true);
        }
        var selector = this.get_selected_selector();
        var styles = [];
        this.themetool.overlay.bodyNode.all('.style_definitions .styleattribute').each(function(){
            styles.push(this.get('innerHTML'));
        });
        this.themetool.previewtag.setContent(selector+' {'+styles.join('')+'}');
    },
    /**
     * Builds the controls div for this component and stores it. This is done to increase
     * percieved performance when using the tool!
     */
    init_generate_controls : function() {
        if (this.controlsnode == null) {
            // Some aliases
            var create = this.Y.Node.create;
            var str = M.str.block_css_theme_tool;
            var self = M.block_css_theme_tool;

            // Creating control structure
            var controls = create('<div class="css_selector_controls"></div>');
            controls.append(create('<div class="colorpickerdialogue"></div>'));
            controls.append(create('<div class="control colourpicker" title="'+str.fontcolour+'"> </div>'));
            controls.append(create('<div class="control backgroundcolourpicker" title="'+str.backgroundcolour+'"> </div>'));
            controls.append(create('<div class="control bold" title="'+str.bold+'"> </div>'));
            controls.append(create('<div class="control italic" title="'+str.italic+'"> </div>'));
            controls.append(create('<div class="control underline" title="'+str.underline+'"> </div>'));
            controls.append(create('<div class="control alignleft" title="'+str.alignleft+'"> </div>'));
            controls.append(create('<div class="control aligncenter" title="'+str.aligncenter+'"> </div>'));
            controls.append(create('<div class="control alignright" title="'+str.alignright+'"> </div>'));
            controls.append(create('<div class="control roundedcorners" title="'+str.roundedcorners+'"> </div>'));
            controls.append(create('<div class="control opacity" title="'+str.opacity+'"> </div>'));

            var buttons = create('<div class="paramcenter"></div>');
            buttons.append(create('<input type="button" id="highlightaffectedcells" value="'+str.highlight+'" />'));
            buttons.append(create('<input type="button" id="previewaffectedcells" value="'+str.preview+'" />'));
            buttons.append(create('<input type="button" id="viewthepage" value="'+str.viewthepage+'" />'));
            buttons.append(create('<input id="commitnewstyle" type="button" value="'+str.save+'" />'));
            buttons.append(create('<input id="cancelnewstyle" type="button" value="'+str.cancel+'" />'));
            buttons.one('#commitnewstyle').on('click', this.save, this);
            buttons.one('#cancelnewstyle').on('click', this.hide, this);
            buttons.one('#highlightaffectedcells').on('mousedown', function() {
                this.highlight_affected_cells();
                this.themetool.overlay.bodyNode.setStyle('opacity', 0.2);
            }, this);
            buttons.one('#highlightaffectedcells').on('mouseup', function(){
                this.themetool.overlay.bodyNode.setStyle('opacity', 1.0);
                this.Y.all('.cssbuilder_highlight_container').remove();
            }, this);
            buttons.one('#previewaffectedcells').on('mousedown', function(){
                this.preview_affected_cells();
                this.themetool.overlay.bodyNode.setStyle('opacity', 0.2);
            }, this);
            buttons.one('#previewaffectedcells').on('mouseup', function(){
                this.themetool.overlay.bodyNode.setStyle('opacity', 1.0);
                this.themetool.previewtag.setContent('');
            }, this);
            buttons.one('#viewthepage').on('mousedown', function(){
                this.setStyle('opacity', 0.2);
            }, this.themetool.overlay.bodyNode);
            buttons.one('#viewthepage').on('mouseup', function(){
                this.setStyle('opacity', 1.0);
            }, this.themetool.overlay.bodyNode);
            controls.append(buttons);

            // Wiring control structure
            this.components['colour'] = new self.colour_picker(this, controls.one('.control.colourpicker'), 'color');
            this.components['backgroundcolor'] = new self.colour_picker(this, controls.one('.control.backgroundcolourpicker'), 'background-color');
            this.components['roundedcorners'] = new self.rounded_corners(this, controls.one('.control.roundedcorners'));
            this.components['opacity'] = new self.opacity(this, controls.one('.control.opacity'));
            this.components['bold'] = new self.generic_add_style_button(this, controls.one('.control.bold'), 'font-weight: bold;');
            this.components['italic'] = new self.generic_add_style_button(this, controls.one('.control.italic'), 'font-style: italic;');
            this.components['underline'] = new self.generic_add_style_button(this, controls.one('.control.underline'), 'text-decoration: underline;');
            this.components['alignleft'] = new self.generic_add_style_button(this, controls.one('.control.alignleft'), 'text-align: left;');
            this.components['aligncenter'] = new self.generic_add_style_button(this, controls.one('.control.aligncenter'), 'text-align: center;');
            this.components['alignright'] = new self.generic_add_style_button(this, controls.one('.control.alignright'), 'text-align: right;');

            this.controlsnode = controls;
        }
        return this.controlsnode
    },
    /**
     * Show the CSS builder component
     *
     * @param {Y.Node} target The target node to create/edit a rule for.
     */
    show : function(target) {
        // Hide all other components
        this.themetool.hide_components();
        // Create the HTML for the comontent
        var content = this.Y.Node.create('<div class="css_builder"></div>');
        var selectorcontent = this.Y.Node.create('<div class="css_selectors"></div>');
        var selectors = [];
        this.selectorcount = 0;

        var editseletor = null;
        if (arguments.length > 1) {
            var editseletor = arguments[1];
        }

        while (target) {
            // Create a selector for each node back to the html tag
            selectors.push(this.generate_selectors_for_node(target, editseletor));
            target = target.ancestor()
        }
        // Reverse it otherwise its all backwards !
        selectors.reverse();
        for (var i in selectors) {
            // Add each selector to the selector content node
            selectorcontent.append(selectors[i]);
        }

        content.append(selectorcontent);
        // Add the style defintion node
        content.append(this.Y.Node.create('<div class="css_current_selector"><div class="selectorcontainer"></div>{<ul class="style_definitions"></ul>}</div>'));
        // Add the controls
        content.append(this.controlsnode);

        // Sets up the themetool overlay
        this.themetool.overlay.set('bodyContent', content);
        this.themetool.overlay.show();
        // Attaches an update event to EVERY seletor shown in the compontent
        this.themetool.overlay.bodyNode.all('.tagselectorbox input.tagselector').on('click', this.update, this);
        // Update it node anyway
        this.update();
        this.shown = true;
    },
    /**
     * Hides this component if it is being shown
     */
    hide : function() {
        if (this.shown) {
            this.themetool.previewtag.setContent('');
            this.themetool.overlay.set('bodyContent', '');
            this.themetool.overlay.hide();
            this.shown = false;
        }
    },
    /**
     * Given a node this generates a set of selectors for it. Tag name, classes and id.
     *
     * @param {Y.Node} node
     * @return {Y.Node} The selectors node
     */
    generate_selectors_for_node : function(node, select) {
        // Get the tag name
        var tag = node.get('nodeName').toLowerCase();
        // Get the tag id
        var tagid = node.getAttribute('id');
        // Get an array of classes
        var tagclasses = node.get('className').split(' ');

        // Create a container
        var content = this.Y.Node.create('<div class="tagselectorbox"></div>');
        // Add the tag selector
        content.append(this.Y.Node.create('<div class="tagname"><input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value="'+tag+'" /><label id="tagselector_'+this.selectorcount+'_label">'+tag+'<label></div>'));
        var tregex = new RegExp(tag);
        if (select != null && tregex.test(select)) {
            content.one('.tagname .tagselector').setAttribute('checked', true);
            content.one('.tagname').addClass('isselected');
        }
        // If there is an id for the node add an ID selector
        if (tagid && tagid != '' && tagid.match && !tagid.match(/^yui_\d/)) {
            // Increase the selector count VERY IMPORTANT
            this.selectorcount++;
            var iddiv = this.Y.Node.create('<div class="tagid"> </div>')
            var idinput = this.Y.Node.create('<input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value="#'+tagid+'" />');
            var idlabel = this.Y.Node.create('<label id="tagselector_'+this.selectorcount+'_label">#'+tagid+'<label>');
            iddiv.append(idinput).append(idlabel);
            content.append(iddiv);
            var regex = new RegExp('#'+tagid+'( |$)');
            if ((/^page\-[a-zA-Z_\-]+/.test(tagid) && tag == 'body' && select==null) || (select != null && regex.test(select))) {
                idinput.setAttribute('checked', true);
                iddiv.addClass('isselected');
            }
        }

        var propertiesdiv = this.Y.Node.create('<div class="tagproperties"></div>');
        var properties = ['after', 'before', 'last-child', 'first-child'];
        for (i in properties) {
            this.selectorcount++;
            var tagproperty = this.Y.Node.create('<div class="tagproperty"></div>');
            var tagpropertyinput = this.Y.Node.create('<input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value=":'+properties[i]+'" />');
            var tagpropertylabel = this.Y.Node.create('<label id="tagselector_'+this.selectorcount+'_label">:'+properties[i]+'<label>');
            var pregex = new RegExp(':'+properties[i]);
            if (select != null && pregex.test(select)) {
                // Check it by default IF it is the first class and not one of the nondefaultclasses
                tagproperty.addClass('isselected');
                tagpropertyinput.set('checked', true);
            }
            tagproperty.append(tagpropertyinput);
            tagproperty.append(tagpropertylabel);
            propertiesdiv.append(tagproperty);
        }
        // Add the classes to the content
        content.append(propertiesdiv);

        // Add each class in the classes array to the tag selectors
        if (tagclasses && tagclasses.length > 0) {
            var classes = this.Y.Node.create('<div class="tagclasses"></div>');
            for (var i in tagclasses) {
                var c = tagclasses[i];
                // Don't process if its empty or based on settings for the tool.
                if (!c || c=='' || (!this.themetool.cfg.showadvancedbodytags && tag=='body' && !c.match(/^(page|path)\-/))) {
                    continue;
                }
                // Increase the selector count VERY IMPORTANT
                this.selectorcount++;
                // Add the class as a selector
                var tagclass = this.Y.Node.create('<div class="tagclass"></div>');
                var tagclassinput = this.Y.Node.create('<input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value=".'+c+'" />');
                var tagclasslabel = this.Y.Node.create('<label id="tagselector_'+this.selectorcount+'_label">.'+c+'<label>');
                var cregex = new RegExp('\\.'+c);
                if ((select==null && i==0 && !M.util.in_array(c, this.nondefaultclasses)) || (select != null && cregex.test(select))) {
                    // Check it by default IF it is the first class and not one of the nondefaultclasses
                    tagclass.addClass('isselected');
                    tagclassinput.set('checked', true);
                }
                tagclass.append(tagclassinput);
                tagclass.append(tagclasslabel);
                classes.append(tagclass);
            }
            // Add the classes to the content
            content.append(classes);
        }
        
        // Increase the selector count VERY IMPORTANT
        this.selectorcount++;
        // Return the selector content node
        return content;
    },
    /**
     * Adds controls to add a style to the selector creating a rule
     * @param {Y.Event} e
     */
    add_style : function(e) {
        // Get the definitions UL
        var ul = this.themetool.overlay.bodyNode.one('.style_definitions');
        // Gets the new style li
        var addnewstyle = ul.one('.addnewstyle').ancestor('li');
        // Hide it :)
        addnewstyle.addClass('hideme');
        // Create a new li
        var newstyleli = this.Y.Node.create('<li></li>');
        // Create an input to type the style into
        var newstyleinput = this.Y.Node.create('<input type="text" value="" id="nextstyleinput" />');
        // Combine
        newstyleli.append(newstyleinput);
        // Add the new LI to the UL collection
        ul.insert(newstyleli, addnewstyle);
        // Focus on the input
        newstyleinput.focus();
        // Attach an event to complete the process if Tab or Enter are pressent
        this.Y.on('key', this.process_style, newstyleinput, 'press:9,13', this, newstyleinput);
    },
    /**
     * Manually adds a given style to the current selector structure
     * @param {string} newstyle
     */
    manual_add_style : function(newstyle) {
        if (/[^;]$/.test(newstyle)) {
            newstyle += ';';
        }
        var li = this.Y.one('.css_current_selector ul.style_definitions').one('.addnewstyle').ancestor('li');
        li.ancestor().insert(this.create_style_li(newstyle, 'styleattribute'), this.Y.Node.getDOMNode(li));
    },
    /**
     * Processes the contents of the add style input and adds it properly to the rule
     * @param {Y.Event} e
     * @param {Y.Node} i The input node
     * @param {bool} finish If true then we are done adding styles and should revert to
     *               basic layout
     */
    process_style : function(e, i, finish) {
        var newstyle = i.get('value');
        var li = i.ancestor('ul').one('.addnewstyle').ancestor('li');
        var liswitch = (finish===true);
        if (newstyle.match(/^[^:]+:.*$/)) {
            if (/[^;]$/.test(newstyle)) {
                newstyle += ';';
            }
            li.ancestor().insert(this.create_style_li(newstyle, 'styleattribute'), this.Y.Node.getDOMNode(li));
            i.set('value', '');
        } else if (newstyle.match(/^\s*$/)) {
            liswitch = true;
        }
        if (liswitch) {
            li.removeClass('hideme');
            i.remove();
        }
    },
    /**
     * Saves the rule as a selector and styles collection in the database using an
     * AJAX call.
     */
    save : function() {
        if (this.Y.one('#nextstyleinput')) {
            this.process_style(null, this.Y.one('#nextstyleinput'), true);
        }

        var selector = this.get_selected_selector();
        var styles = [];
        this.themetool.overlay.bodyNode.all('.style_definitions .styleattribute').each(function(){
            styles.push(this.get('innerHTML'));
        });
        if (this.themetool.add_rule(selector, styles)) {
            this.hide();
        } else {
            alert('Unable to save the rule');
        }
    },
    /**
     * Updates the selector and rules shown to the user to reflect changes in what
     * the user has selected
     */
    update : function() {
        if (this.themetool.overlay.bodyNode.all('.addnewstyle').size()<1) {
            var li = this.Y.Node.create('<li><span class="addnewstyle">'+M.str.block_css_theme_tool.addnewstyle+'</span></li>');
            this.themetool.overlay.bodyNode.one('.css_current_selector .style_definitions').append(li);
            li.on('click', this.add_style, this);
        }

        var selected = this.get_selected_selectors();
        var selectors = [];
        var rawselectors = [];
        for (var i in selected) {
            var selectorsinbox = [];
            var rawselectorsinbox = [];
            for (var j in selected[i]) {
                rawselectorsinbox.push(selected[i][j].get('value'));
                selectorsinbox.push('<span class="'+selected[i][j].ancestor().get('className')+'">'+selected[i][j].get('value')+'</span>');
            }
            selectors.push(selectorsinbox.join(''));
            rawselectors.push(rawselectorsinbox.join(''))
        }
        this.themetool.overlay.bodyNode.one('.css_current_selector .selectorcontainer').set('innerHTML', selectors.join(' '));

        var l = this.themetool.overlay.bodyNode.one('.style_definitions .addnewstyle').ancestor('li');
        var ul = l.ancestor('ul');
        ul.all('.styleattribute.predefined').each(function(){
            this.ancestor('li').remove();
        });
        var currentrule = this.themetool.get_rule(rawselectors.join(' '));
        if (currentrule) {
            for (j in currentrule.styles) {
                ul.insert(this.create_style_li(currentrule.styles[j], 'styleattribute predefined'), this.Y.Node.getDOMNode(l));
            }
        }
    },
    /**
     * Convenience function to create an LI node with editing controls
     * @param {string} style
     * @param {string} classstr
     * @return {Y.Node}
     */
    create_style_li : function(style, classstr) {
        var li = this.Y.Node.create('<li></li>');
        var editicon = this.Y.Node.create('<img src="'+M.util.image_url('t/edit', 'moodle')+'" alt="edit" style="width:8px;height:8px;" class="icon" />');
        editicon.on('click', this.edit_style, this, li, style);
        var deleteicon = this.Y.Node.create('<img src="'+M.util.image_url('t/delete', 'moodle')+'" alt="delete" style="width:8px;height:8px;" class="icon" />');
        deleteicon.on('click', this.delete_style, this, li);
        li.append(editicon).append(deleteicon).append(this.Y.Node.create('<span class="'+classstr+'">'+style+'</span>'));
        return li;
    },
    /**
     * Deletes the selected style
     * @param {Y.Event} e
     * @param {Y.Node} li
     */
    delete_style : function(e, li) {
        li.remove();
    },
    /**
     * Opens a set style for editing
     * @param {Y.Event} e
     * @param {Y.Node} li
     * @param {string} style
     */
    edit_style : function(e, li, style) {
        if (this.Y.one('#nextstyleinput')) {
            this.process_style(null, this.Y.one('#nextstyleinput'), true);
        }
        li.remove();
        this.add_style(e);
        this.Y.one('#nextstyleinput').set('value',style);
    },
    /**
     * Gets an array of the selected selectors
     *
     * @return {array}
     */
    get_selected_selectors : function() {
        var selectors = [];
        this.themetool.overlay.bodyNode.all('.tagselectorbox').each(function(box) {
            var selectorsinbox = [];
            box.all('input.tagselector').each(function(checkbox){
                checkbox.ancestor().removeClass('isselected');
                if (checkbox.get('checked')) {
                    checkbox.ancestor().addClass('isselected');
                    selectorsinbox.push(checkbox);
                }
            }, this);
            if (selectorsinbox.length > 0) {
                selectors.push(selectorsinbox);
            }
        }, this);
        return selectors;
    },
    /**
     * Gets the selected selectors as a string that can be used in CSS or YUI
     *
     * @return {string}
     */
    get_selected_selector : function() {
        var selectors = this.get_selected_selectors();
        var selector = '';
        for (var i in selectors) {
            for (var j in selectors[i]) {
                selector += selectors[i][j].get('value');
            }
            selector += ' ';
        }
        return selector;
    }
}
/**
 * Colour picker component
 *
 * This component I am particually proud of it displays a colour picker control
 * that allows the user to point and click a colour to add it as a style.
 * It is HEAVILY tied to colourpicker_image.php which mathmetically generates
 * the colour picker image and for which this component reverses the process to
 * work out the colour that was clicked on.
 *
 * @class
 * @constructor
 * @param {M.block_css_theme_tool.css_builder} cssbuilder
 * @param {Y.Node} button A node to display the picker when clicked
 * @param {string} cssstyle The style to add the colour for
 */
M.block_css_theme_tool.colour_picker = function(cssbuilder, button, cssstyle) {
    var Y = cssbuilder.Y;
    this.cssbuilder = cssbuilder;
    this.currentcolour = '#FFFFFF';
    this.cssstyle = cssstyle;

    this.box = new Y.Overlay({
        headerContent : '<h2 class="header">'+M.str.block_css_theme_tool.colourpickertitle+'</h2><div class="close"></div>',
        bodyContent : '<div class="colorpickerdialogueoverlay"></div><div class="previouscolours"></div>',
        centered : true,
        visible : false,
        zIndex : 4500
    });
    this.box.render(Y.one(document.body));
    this.box.get('boundingBox').one('.close').on('click', this.hide, this);
    this.dialogue = this.box.get('boundingBox').addClass('ctt-colourpicker').one('.colorpickerdialogueoverlay');
    this.dialogue.on('click', this.pick_colour, this);
    this.dialogue.on('mouseenter', this.start_follow, this);
    this.dialogue.on('mouseleave', this.stop_follow, this);

    this.overlay = new Y.Overlay({
        bodyContent : ' ',
        width: '50px',
        height : '50px',
        centered : false,
        visible : false,
        zIndex : 4600
    });
    this.overlay.render(this.cssbuilder.Y.one(document.body));
    this.overlay.bodyNode.addClass('colourpicker_preview');
    button.on('click', this.show, this);

    var previous = Y.Cookie.get("cttpreviouscolours");
    if (previous && M.block_css_theme_tool.previouscolours.length == 0) {
        previous = previous.split(';');
        var pcs = this.box.get('boundingBox').one('.previouscolours');
        for (var i in previous) {
            var pc = Y.Node.create('<div class="previouscolour"></div>').setStyle('backgroundColor', previous[i]);
            pc.on('click', this.pick_previous_colour, this, previous[i]);
            pcs.append(pc);
        }
        M.block_css_theme_tool.previouscolours = previous;
    }
}

/**
 * Colour picker properties
 */
M.block_css_theme_tool.colour_picker.prototype = {
    /**
     * The YUI instance
     * @var {YUI}
     */
    Y : null,
    /**
     * The box top display in
     * @var {Y.Node}
     */
    box : null,
    dialogue : null,
    /**
     * The overlay this component uses
     * @var {Y.Overlay}
     */
    overlay : null,
    /**
     * The currently selected colour
     * @var {string}
     */
    currentcolour : null,
    /**
     * @var {bool}
     */
    overlayshown : false,
    /**
     * The CSS builder this component is associated with
     * @var {M.block_css_theme_tool.css_builder}
     */
    cssbuilder : null,
    /**
     * The style this picker is used for
     * @var {string}
     */
    cssstyle : null,
    width : 384,
    height : 128,
    factor : 4,
    /**
     * An object containing component events
     * @var {object}
     */
    events: {
        /**
         * Used to track when the mouse enters the colour picker
         * @var {Y.Event}
         */
        mouseenter : null,
        /**
         * Used to track the click event of the colour picker
         * @var {Y.Event}
         */
        click : null,
        /**
         * Used to track when the mouse moves over the colour picker
         * @var {Y.Event}
         */
        mousemove : null,
        /**
         * Used to track when the mouse leaves the colour picker
         * @var {Y.Event}
         */
        mouseleave : null
    },
    /**
     * Sets the background colour to the floating overlay to that of the colour the mouse is over.
     * @var {Y.Event}
     */
    display_color : function(e) {
        this.overlay.move(e.pageX+10, e.pageY+10);
        this.currentcolour = this.determine_colour(e);
        this.overlay.bodyNode.setStyle('backgroundColor', this.currentcolour);
    },
    /**
     * Starts the proceedings for the colour picker, following changes the overlay
     * background colour and when clicked stops and adds the style to the CSS builder.
     * @var {Y.Event}
     */
    start_follow : function(e) {
        if (this.events.mousemove) {
            this.events.mousemove.detach();
        }
        this.overlay.show();
        this.overlayshown = true;
        this.events.mousemove = this.dialogue.on('mousemove', this.display_color, this);
        this.display_color(e);
    },
    /**
     * Stops following the mouse and does away with the colour picker
     */
    stop_follow : function() {
        this.overlay.hide();
        this.overlayshown = false;
        this.events.mousemove.detach();
    },
    /**
     * Determines the colour the mouse is currently over.
     *
     * This is the a reversal of the logic in ~/colourpicker_image.php and mathematically
     * determines the colour below the mouse pointer
     * @var {Y.Event}
     * @return {string}
     */
    determine_colour : function(e) {

        if (e.target) {
            var eventx = Math.floor(e.pageX-e.target.getX());
            var eventy = Math.floor(e.pageY-e.target.getY());
        } else {
            return;
        }

        var imagewidth = this.width;
        var imageheight = this.height;
        var factor = this.factor;
        var colour = [255,0,0];

        var matrices = [
            [  0,  1,  0],
            [ -1,  0,  0],
            [  0,  0,  1],
            [  0, -1,  0],
            [  1,  0,  0],
            [  0,  0, -1]
        ];

        var matrixcount = matrices.length;
        var limit = Math.round(imagewidth/matrixcount);
        var heightbreak = Math.round(imageheight/2);

        for (var x = 0; x < imagewidth; x++) {
            var divisor = Math.floor(x / limit);
            var matrix = matrices[divisor];

            colour[0] += matrix[0]*factor;
            colour[1] += matrix[1]*factor;
            colour[2] += matrix[2]*factor;

            if (eventx==x) {
                break;
            }
        }

        var pixel = [colour[0], colour[1], colour[2]];
        if (eventy < heightbreak-1) {
            pixel[0] += Math.floor(((255-pixel[0])/heightbreak) * (heightbreak - eventy));
            pixel[1] += Math.floor(((255-pixel[1])/heightbreak) * (heightbreak - eventy));
            pixel[2] += Math.floor(((255-pixel[2])/heightbreak) * (heightbreak - eventy));
        } else if (eventy > heightbreak+1) {
            pixel[0] = Math.floor((imageheight-eventy)*(pixel[0]/heightbreak));
            pixel[1] = Math.floor((imageheight-eventy)*(pixel[1]/heightbreak));
            pixel[2] = Math.floor((imageheight-eventy)*(pixel[2]/heightbreak));
        }

        return this.convert_rgb_to_hex(pixel);
    },
    /**
     * Stops everything and adds the selected colour + style to the CSS builder
     * @var {Y.Event}
     */
    pick_colour : function(e) {
        this.stop_follow();
        this.cssbuilder.manual_add_style(this.cssstyle+': '+this.currentcolour);
        this.set_current_colour(this.currentcolour);
        this.hide();
    },
    pick_previous_colour : function(e, colour) {
        this.stop_follow();
        this.cssbuilder.manual_add_style(this.cssstyle+': '+colour);
        this.hide();
    },
    set_current_colour : function(addcolour) {
        var Y = this.cssbuilder.Y;
        var previous = M.block_css_theme_tool.previouscolours;
        if (addcolour) {
            previous.push(addcolour);
            var pcs = this.box.get('boundingBox').one('.previouscolours');
            var pc = Y.Node.create('<div class="previouscolour"></div>').setStyle('backgroundColor', addcolour);
            pc.on('click', this.pick_previous_colour, this, addcolour);
            pcs.append(pc);
            if (previous.length > 20) {
                while (previous.length > 20) {
                    previous.shift();
                    pcs.one('.previouscolour').remove();
                }
            }
        }
        Y.Cookie.set("cttpreviouscolours", previous.join(';'), { expires: new Date("January 12, 2025") });
    },
    /**
     * Shows the colour picker component
     * @var {Y.Event}
     */
    show : function (e) {
        this.box.show();
    },
    hide : function() {
        this.overlay.hide();
        this.overlayshown = false;
        this.box.hide();
    },
    /**
     * Converts the RGB value into a hex equivilant
     * @param {array} rgb Array(r,g,b);
     * @return {string} #ABCDEF
     */
    convert_rgb_to_hex : function(rgb) {
        var hex = '#';
        var hexchars = "0123456789ABCDEF";
        for (var i=0; i<3; i++) {
            var number = Math.abs(rgb[i]);
            if (number == 0 || isNaN(number)) {
                hex += '00';
            } else {
                hex += hexchars.charAt((number-number%16)/16)+hexchars.charAt(number%16);
            }
        }
        return hex;
    }
}

/**
 * Rounded corners component
 *
 * @class
 * @constructor
 * @param {M.block_css_theme_tool.css_builder} cssbuilder
 * @param {Y.Node} button The button that fires this control
 */
M.block_css_theme_tool.rounded_corners = function(cssbuilder, button) {
    this.cssbuilder = cssbuilder;

    var Y = this.cssbuilder.Y;

    // Create the 4 inputs required to collect the value for the four corners
    this.nodes.topleft = Y.Node.create('<input type="text" size="5" value="10px" name="rc_topleft" />');
    this.nodes.topright = Y.Node.create('<input type="text" size="5" value="10px" name="rc_topright" />');
    this.nodes.bottomleft = Y.Node.create('<input type="text" size="5" value="10px" name="rc_bottomleft" />');
    this.nodes.bottomright = Y.Node.create('<input type="text" size="5" value="10px" name="rc_bottomright" />');
    
    // Create the set and cancel buttons
    this.nodes.setbutton = Y.Node.create('<input type="submit" value="'+M.str.block_css_theme_tool.set+'" />');
    this.nodes.cancelbutton = Y.Node.create('<input type="submit" value="'+M.str.block_css_theme_tool.cancel+'" />');

    // Create a node that contains the four inputs
    var inputs = Y.Node.create('<div class="inputs"></div>');
    inputs.append(Y.Node.create('<div></div>').append('<label for="rc_topleft">'+M.str.block_css_theme_tool.postopleft+'</label>').append(this.nodes.topleft));
    inputs.append(Y.Node.create('<div></div>').append('<label for="rc_topright">'+M.str.block_css_theme_tool.postopright+'</label>').append(this.nodes.topright));
    inputs.append(Y.Node.create('<div></div>').append('<label for="rc_bottomleft">'+M.str.block_css_theme_tool.posbottomleft+'</label>').append(this.nodes.bottomleft));
    inputs.append(Y.Node.create('<div></div>').append('<label for="rc_bottomright">'+M.str.block_css_theme_tool.posbottomright+'</label>').append(this.nodes.bottomright));

    // Create a node that contains the two buttons
    var buttons = Y.Node.create('<div class="buttons"></div>');
    buttons.append(this.nodes.setbutton);
    buttons.append(this.nodes.cancelbutton);

    // Create the overlay this component will use
    this.overlay = new Y.Overlay({
        bodyContent : Y.Node.create('<div></div>').append(inputs).append(buttons),
        headerContent : '<h2 class="header">'+M.str.block_css_theme_tool.roundedcorners+'</h2>',
        width: '300px',
        centered : true,
        visible : false,
        zIndex : 5001
    });
    this.overlay.render(Y.one(document.body));
    this.overlay._stdModNode.ancestor().addClass('rounded_corner_component');

    // Attach the set and cancel events
    this.nodes.cancelbutton.on('click', this.hide, this);
    this.nodes.setbutton.on('click', this.set, this);

    // Attach the show event
    button.on('click', this.show, this);
}
/**
 * Properties and methods of the rounded corners component
 */
M.block_css_theme_tool.rounded_corners.prototype = {
    cssbuilder : null,
    nodes : {
        setbutton : null,
        cancelbutton : null,
        topleft : null,
        topright : null,
        bottomleft: null,
        bottomright : null
    },
    overlay : null,
    overlayshown : false,
    /**
     * Show the component overlay
     */
    show : function(e) {
        this.overlay.show();
        this.overlayshown = true;
    },
    /**
     * Process the form and set the rounded corner attributes
     */
    set : function() {
        var tl = this.nodes.topleft.get('value') || false;
        var tr = this.nodes.topright.get('value') || false;
        var bl = this.nodes.bottomleft.get('value') || false;
        var br = this.nodes.bottomright.get('value') || false;

        if (tl && tr && bl && br && tl == tr  && tr == bl && bl == br) {
            this.cssbuilder.manual_add_style('border-radius: '+tl);
            this.cssbuilder.manual_add_style('-moz-border-radius: '+tl);
            this.cssbuilder.manual_add_style('-webkit-border-radius: '+tl);
        } else {
            if (tl) {
                this.cssbuilder.manual_add_style('border-top-left-radius: '+tl);
                this.cssbuilder.manual_add_style('-moz-border-radius-topleft: '+tl);
                this.cssbuilder.manual_add_style('-webkit-border-top-left-radius: '+tl);
            }
            if (tr) {
                this.cssbuilder.manual_add_style('border-top-right-radius: '+tr);
                this.cssbuilder.manual_add_style('-moz-border-radius-topright: '+tr);
                this.cssbuilder.manual_add_style('-webkit-border-top-right-radius: '+tr);
            }
            if (bl) {
                this.cssbuilder.manual_add_style('border-bottom-left-radius: '+bl);
                this.cssbuilder.manual_add_style('-moz-border-radius-bottomleft: '+bl);
                this.cssbuilder.manual_add_style('-webkit-border-bottom-left-radius: '+bl);
            }
            if (br) {
                this.cssbuilder.manual_add_style('border-bottom-right-radius: '+br);
                this.cssbuilder.manual_add_style('-moz-border-radius-bottomright: '+br);
                this.cssbuilder.manual_add_style('-webkit-border-bottom-right-radius: '+br);
            }
        }
        this.hide();
    },
    /**
     * Hide the component overlay
     */
    hide : function() {
        this.overlay.hide();
        this.overlayshown = false;
    }
}

/**
 * Opacity component
 *
 * @class
 * @constructor
 * @param {M.block_css_theme_tool.css_builder} cssbuilder
 * @param {Y.Node} button The button that relates to this component
 */
M.block_css_theme_tool.opacity = function(cssbuilder, button) {
    this.cssbuilder = cssbuilder;
    button.on('click', this.show, this);
}
/**
 * Properties and methods of the opacity component
 */
M.block_css_theme_tool.opacity.prototype = {
    cssbuilder : null,
    show : function() {
        var opacity = prompt(M.str.block_css_theme_tool.opacityprompt);
        opacity = opacity.replace(/^0?\./, '');
        opacity = opacity.replace(/\%$/, '');
        if (opacity.match(/^(\d{1,2}|100)$/)) {
            this.cssbuilder.manual_add_style('-moz-opacity: .'+opacity);
            this.cssbuilder.manual_add_style('filter: alpha(opacity='+opacity+')');
            this.cssbuilder.manual_add_style('opacity: .'+opacity);
        }
    }
}
/**
 * Generic add style button component
 * @class
 * @constructor
 * @param {M.block_css_theme_tool.css_builder} cssbuilder
 * @param {Y.Node} button
 * @param {string} style
 */
M.block_css_theme_tool.generic_add_style_button = function(cssbuilder, button, style) {
    this.cssbuilder = cssbuilder;
    this.button = button;
    this.style = style;
    button.on('click', this.add_style, this);
}
/**
 * Properties for generic_add_style_button
 */
M.block_css_theme_tool.generic_add_style_button.prototype = {
    /**
     * CSS builder instance this component is associated with
     * @var {M.block_css_theme_tool.css_builder}
     */
    cssbuilder : null,
    /**
     * The button to attach this to
     * @var {Y.Node}
     */
    button : null,
    /**
     * The style this should add
     * @var {string}
     */
    style : null,
    /**
     * Adds the style to the CSS builder
     */
    add_style : function() {
        this.cssbuilder.manual_add_style(this.style);
    }
}
/**
 * CSS theme tool settings manager
 *
 * This is a component that allows the user to take advanced actions and toggle the settings
 * for the CSS theme tool.
 *
 * @class
 * @constructor
 * @param {YUI} Y
 * @param {css_theme_tool} themetool
 */
M.block_css_theme_tool.settings_manager = function(Y, themetool) {
    this.Y = Y;
    this.themetool = themetool;
    this.init_generate_content();
    Y.one('.block_css_theme_tool input.settingsbutton').removeAttribute('disabled').on('click', this.show, this);
}

/**
 * Properties for the settings manager
 */
M.block_css_theme_tool.settings_manager.prototype = {
    /**
     * The YUI instance
     * @var {YUI}
     */
    Y : null,
    /**
     * Theme tool instance this component belongs to
     * @var {css_theme_tool}
     */
    themetool : null,
    /**
     * The content for the settings manager
     * @var {Y.Node}
     */
    content : null,
    /**
     * @var {bool}
     */
    shown : false,
    /**
     * Generates the content for this compontent and stores it in
     */
    init_generate_content : function() {
        var Y = this.Y;
        var div = Y.Node.create('<div class="settingscontainer"><h2>Settings</h2></div>');

        var purge = Y.Node.create('<input type="button" value="'+M.str.block_css_theme_tool.purgerules+'" />');
        var purgediv = Y.Node.create('<div class="settingbox"></div>');
        purgediv.append(purge);
        purgediv.append(Y.Node.create('<div class="settingdescription">'+M.str.block_css_theme_tool.purgerulesdesc+'</div>'));
        div.append(purgediv);

        var exportcss = Y.Node.create('<input type="button" value="'+M.str.block_css_theme_tool.exportcss+'" />');
        var exportcssdiv = Y.Node.create('<div class="settingbox"></div>');
        exportcssdiv.append(exportcss);
        exportcssdiv.append(Y.Node.create('<div class="settingdescription">'+M.str.block_css_theme_tool.exportcssdesc+'</div>'));
        div.append(exportcssdiv);

        /**
         * To be created at a later point
         * 
         * var exporttheme = Y.Node.create('<input type="button" value="'+M.str.block_css_theme_tool.exporttheme+'" />');
         * var exportthemediv = Y.Node.create('<div class="settingbox"></div>');
         * exportthemediv.append(exporttheme);
         * exportthemediv.append(Y.Node.create('<div class="settingdescription">'+M.str.block_css_theme_tool.exportthemedesc+'</div>'));
         * div.append(exportthemediv);
         *
         * exporttheme.on('click', this.themetool.export_theme, this.themetool);
         */


        var showadvancedbodytags = Y.Node.create('<input type="checkbox" value="'+M.str.block_css_theme_tool.showadvancedbodytags+'" />');
        var showadvancedbodytagsdiv = Y.Node.create('<div class="settingbox"></div>');
        showadvancedbodytagsdiv.append(showadvancedbodytags);
        showadvancedbodytagsdiv.append(Y.Node.create('<div class="settingdescription">'+M.str.block_css_theme_tool.showadvancedbodytagsdesc+'</div>'));
        div.append(showadvancedbodytagsdiv);
        if (this.themetool.cfg.showadvancedbodytags) {
            showadvancedbodytags.set('checked', true);
        }

        var autosaveonchange = Y.Node.create('<input type="checkbox" value="'+M.str.block_css_theme_tool.autosaveonchange+'" />');
        var autosaveonchangediv = Y.Node.create('<div class="settingbox"></div>');
        autosaveonchangediv.append(autosaveonchange);
        autosaveonchangediv.append(Y.Node.create('<div class="settingdescription">'+M.str.block_css_theme_tool.autosaveonchangedesc+'</div>'));
        div.append(autosaveonchangediv);
        if (this.themetool.cfg.autosaveonchange) {
            autosaveonchange.set('checked', true);
        }

        var onlyviewmyrules = Y.Node.create('<input type="checkbox" value="'+M.str.block_css_theme_tool.onlyviewmyrules+'" />');
        var onlyviewmyrulesdiv = Y.Node.create('<div class="settingbox"></div>');
        onlyviewmyrulesdiv.append(onlyviewmyrules);
        onlyviewmyrulesdiv.append(Y.Node.create('<div class="settingdescription">'+M.str.block_css_theme_tool.onlyviewmyrulesdesc+'</div>'));
        div.append(onlyviewmyrulesdiv);
        if (this.themetool.cfg.onlyviewmyrules) {
            onlyviewmyrules.set('checked', true);
        }

        var controls = Y.Node.create('<div class="overlaycontrols"></div>');
        var closebutton = Y.Node.create('<input type="button" value="'+M.str.block_css_theme_tool.close+'" />');
        controls.append(closebutton);
        div.append(controls);

        purge.on('click', this.themetool.purge_rules, this.themetool);
        exportcss.on('click', this.themetool.export_css, this.themetool);
        showadvancedbodytags.on('click', this.toggle_showadvancedbodytags, this, showadvancedbodytags);
        autosaveonchange.on('click', this.toggle_autosaveonchange, this, autosaveonchange);
        onlyviewmyrules.on('click', this.toggle_onlyviewmyrules, this, onlyviewmyrules);
        closebutton.on('click', this.hide, this);

        this.content = div;
    },
    /**
     * Shows the settings manager
     */
    show : function() {
        this.themetool.hide_components();
        this.themetool.overlay.set('bodyContent', this.content);
        this.themetool.overlay.show();
        this.shown = true;
    },
    /**
     * Hides the settings manager if is is being shown
     */
    hide : function() {
        if (this.shown) {
            this.themetool.overlay.hide();
            this.shown = false;
        }
    },
    /**
     * Toggles the showing of advanced body tags
     * @param {Y.Event} e
     * @param {Y.Node} checkbox
     */
    toggle_showadvancedbodytags : function(e, checkbox) {
        this.themetool.cfg.showadvancedbodytags = (checkbox.get('checked'))?true:false;
        M.util.set_user_preference('css_theme_tool_full_body_tags', this.themetool.cfg.showadvancedbodytags);
    },
    /**
     * Toggles auto-saveing of changes
     * @param {Y.Event} e
     * @param {Y.Node} checkbox
     */
    toggle_autosaveonchange : function(e, checkbox) {
        this.themetool.cfg.autosaveonchange = (checkbox.get('checked'))?true:false;
        if (this.themetool.cfg.autosaveonchange) {
            this.themetool.save_rules();
        }
        M.util.set_user_preference('css_theme_tool_auto_save_changes', this.themetool.cfg.autosaveonchange);
    },
    /**
     * Toggles auto-saveing of changes
     * @param {Y.Event} e
     * @param {Y.Node} checkbox
     */
    toggle_onlyviewmyrules : function(e, checkbox) {
        this.themetool.cfg.onlyviewmyrules = (checkbox.get('checked'))?true:false;
        if (this.themetool.cfg.onlyviewmyrules) {
            this.themetool.fire('cssthemetool:changed');
        }
        M.util.set_user_preference('css_theme_tool_only_view_my_rules', this.themetool.cfg.onlyviewmyrules);
    }
}