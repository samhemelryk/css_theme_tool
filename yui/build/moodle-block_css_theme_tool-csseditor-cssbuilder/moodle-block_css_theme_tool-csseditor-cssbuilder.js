YUI.add('moodle-block_css_theme_tool-csseditor-cssbuilder', function (Y, NAME) {

var CSSBUILDER = function(config) {
    CSSBUILDER.superclass.constructor.apply(this, arguments);
};
CSSBUILDER.prototype = {
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
     * Bool when set to true everything needed has been set up.
     */
    allreadytogo : false,
    /**
     * Used by all components to display their content nicely
     * @var {YUI.Overlay}
     */
    overlay : null,
    /**
     * Initialises the new css builder object
     */
    initializer : function(config) {
        // Store the arguments
        this.themetool = config.cssthemetool;

        var bd = Y.one(document.body);
        var winheight = bd.get('winHeight');
        // Instantiate the overlay
        this.overlay = new Y.Overlay({
            bodyContent : 'temp',
            width: '80%',
            height : Math.floor(winheight*0.8),
            visible : false,
            zIndex : 500,
            id : 'cssbuilder-overlay'
        });
        // Render it on the body (less chance of clipping)
        this.overlay.render(bd);
        Y.one('#cssbuilder-overlay').addClass('css-theme-tool-overlay').setStyle('position', 'fixed').setStyle('margin', Math.floor(winheight*0.1)+'px 10%');
        Y.on('windowresize', function(e){
            var winheight = bd.get('winHeight');
            this.overlay.set('height', Math.floor(winheight*0.8));
            Y.one('#cssbuilder-overlay').setStyle('marginTop', Math.floor(winheight*0.1));
        }, this);
        // Add our custom class
        this.overlay.bodyNode.addClass('css_builder_overlay');

        // Create the mask. This will be used to capture click events
        this.mask = new Y.Overlay({
            bodyContent : ' ',
            width: '100%',
            height: '100%',
            visible : false,
            xy : [0,0]
        });
        // Render it to the body, it needs to be here to avoid clipping rules
        this.mask.render(Y.one(document.body));
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
        // Enable the addrule button and attach the click event
        config.el.on('click', this.capture_next_click, this);
        this.capture_next_click(config.e);
    },
    /**
     * When called this sets the component up to capture the next click to add a rule
     */
    capture_next_click : function() {
        this.init_generate_controls();
        // Hide all components, I don't want people to style them ;)
        this.themetool.hide_components();
        // Show the mask
        this.mask.show();
        // Create a set of divs to highlight the element under the mouse
        var div = Y.one('#mousemovetrackdiv') || (function(Y){
            var div = Y.Node.create('<div id="mousemovetrackdiv"><div class="inner-border"><div class="inner-background"></div></div></div>');
            div.setStyle('opacity', 0.4);
            Y.one(document.body).append(div);
            return div;
        })(Y);
        div.setStyle('visibility', 'visible');
        // Capture all body clicks
        this.eventcaptureclick = div.on('click', this.capture_click, this);
        // Attach the highlight event
        this.eventmousemove = Y.one(document.body).on('mousemove', this.highlight_cell_below_event, this, div);
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
        Y.one('#mousemovetrackdiv').setStyle('visibility', 'hidden');
        // Hide the mask
        this.mask.hide();
        try {
            // Attempt to get the element that exists below the click event
            var target = Y.one(document.elementFromPoint(e.clientX, e.clientY));
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
        var target = Y.one(document.elementFromPoint(e.clientX, e.clientY));
        // Show the divs again
        div.setStyle('visibility', 'visible');
        // Show the mask again
        this.mask.show();
        // Get the position of the target node
        var pos = target.getXY();
        div.setXY(pos);
        div.setStyle('width', target.get('offsetWidth')+'px');
        div.setStyle('height', target.get('offsetHeight')+'px');
        div.one('.inner-border').setStyle('width', (target.get('offsetWidth')-12)+'px').setStyle('height', (target.get('offsetHeight')-12)+'px');
        return;

        // Get the scroll position .... grr
        var scrollY = Y.one('window').get('scrollY');
        // Get the window width and hieght
        var winpos = [Y.one(document.body).get('winWidth'), Y.one(document.body).get('winHeight')];
        // Change the highlight div dimensions to highlight the node being hovered over

        div.one('.top').setStyle('height', Math.round(pos[1]-scrollY).toString()+'px');
        div.one('.left').setStyle('width', Math.round(pos[0]).toString()+'px');
        div.one('.bottom').setStyle('height', Math.round(winpos[1]-pos[1]-target.get('offsetHeight')+scrollY).toString()+'px');
        div.one('.right').setStyle('width', Math.round(winpos[0]-pos[0]-target.get('offsetWidth')).toString()+'px');
    },
    /**
     * Highlights all of the cells that the current rule selector is going to be
     * applied to.
     * @param {Y.Event} e
     */
    highlight_affected_cells : function(e) {
        // Create a div to contain all highlight divs
        var container = Y.Node.create('<div class="cssbuilder_highlight_container"></div>');
        // Attach it to the body to avoid clipping
        Y.one(document.body).append(container);
        // Add a body watch to make the highlighting obvious
        container.append(Y.Node.create('<div class="cssbuilder_bodywash"></div>'));

        // For each node found by the selector create a div that has the same position
        // and dimensions as the located node. Add it to the highlight container.
        // This new div is the highlight!
        Y.all(this.get_selected_selector()).each(function(node){
            var highlight = Y.Node.create('<div class="cssbuilder_cellhighlight"></div>');
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
        if (Y.one('#nextstyleinput')) {
            this.process_style(null, Y.one('#nextstyleinput'), true);
        }
        var selector = this.get_selected_selector();
        var styles = [];
        this.overlay.bodyNode.all('.style_definitions .styleattribute').each(function(){
            styles.push(this.get('innerHTML'));
        });
        this.themetool.previewtag.setContent(selector+' {'+styles.join('')+'}');
    },
    /**
     * Builds the controls div for this component and stores it. This is done to increase
     * percieved performance when using the tool!
     */
    init_generate_controls : function() {
        if (this.allreadytogo) {
            return true;
        }
        if (this.controlsnode == null) {
            // Some aliases
            var create = Y.Node.create;
            var str = M.str.block_css_theme_tool;
            var self = M.block_css_theme_tool;

            // Creating control structure
            var controls = create('<div class="css_selector_controls"></div>');
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
                this.overlay.bodyNode.setStyle('opacity', 0.2);
            }, this);
            buttons.one('#highlightaffectedcells').on('mouseup', function(){
                this.overlay.bodyNode.setStyle('opacity', 1.0);
                Y.all('.cssbuilder_highlight_container').remove();
            }, this);
            buttons.one('#previewaffectedcells').on('mousedown', function(){
                this.preview_affected_cells();
                this.overlay.bodyNode.setStyle('opacity', 0.2);
            }, this);
            buttons.one('#previewaffectedcells').on('mouseup', function(){
                this.overlay.bodyNode.setStyle('opacity', 1.0);
                this.themetool.previewtag.setContent('');
            }, this);
            buttons.one('#viewthepage').on('mousedown', function(){
                this.setStyle('opacity', 0.2);
            }, this.overlay.bodyNode);
            buttons.one('#viewthepage').on('mouseup', function(){
                this.setStyle('opacity', 1.0);
            }, this.overlay.bodyNode);
            controls.append(buttons);

            // Wiring control structure
            this.prepare_component_use(controls.one('.control.colourpicker'), 'color', 'moodle-block_css_theme_tool-csseditor-colourpicker', 'init_colour_picker', [{cssbuilder:this, button:controls.one('.control.colourpicker'), cssstyle:'color'}]);
            this.prepare_component_use(controls.one('.control.backgroundcolourpicker'), 'backgroundcolor', 'moodle-block_css_theme_tool-csseditor-colourpicker', 'init_colour_picker', [{cssbuilder:this, button:controls.one('.control.backgroundcolourpicker'), cssstyle:'background-color'}]);
            this.prepare_component_use(controls.one('.control.roundedcorners'), 'roundedcorners', 'moodle-block_css_theme_tool-csseditor-dialogueroundedcorners', 'init_rounded_corners', [{cssbuilder:this, button:controls.one('.control.roundedcorners')}]);
            this.prepare_component_use(controls.one('.control.opacity'), 'opacity', 'moodle-block_css_theme_tool-csseditor-dialogueopacity', 'init_dialogue_opacity', [{cssbuilder:this, button:controls.one('.control.opacity')}]);
            
            this.components['bold'] = new ADDSYTLEBUTTON({cssbuilder:this, button:controls.one('.control.bold'), cssstyle:'font-weight: bold;'});
            this.components['italic'] = new ADDSYTLEBUTTON({cssbuilder:this, button:controls.one('.control.italic'), cssstyle:'font-style: italic;'});
            this.components['underline'] = new ADDSYTLEBUTTON({cssbuilder:this, button:controls.one('.control.underline'), cssstyle:'text-decoration: underline;'});
            this.components['alignleft'] = new ADDSYTLEBUTTON({cssbuilder:this, button:controls.one('.control.alignleft'), cssstyle:'text-align: left;'});
            this.components['aligncenter'] = new ADDSYTLEBUTTON({cssbuilder:this, button:controls.one('.control.aligncenter'), cssstyle:'text-align: center;'});
            this.components['alignright'] = new ADDSYTLEBUTTON({cssbuilder:this, button:controls.one('.control.alignright'), cssstyle:'text-align: right;'});

            this.controlsnode = controls;
        }
        this.allreadytogo = true;
        return this.controlsnode
    },
    prepare_component_use : function(el, name, module, callback, args) {
        this.components[name] = el.on('click', function(e){
            e.halt();
            this.components[name].detach();
            var self = this;
            Y.use(module, function(Y) {
                self.components[name] = M.block_css_theme_tool[callback].apply(M.block_css_theme_tool, args);
                self.components[name].show(e);
            });
        }, this);
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
        var content = Y.Node.create('<div class="css_builder"></div>');
        var selectorcontent = Y.Node.create('<div class="css_selectors"></div>');
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
        content.append(Y.Node.create('<div class="css_current_selector"><div class="selectorcontainer"></div>{<ul class="style_definitions"></ul>}</div>'));
        // Add the controls
        content.append(this.controlsnode);

        // Sets up the themetool overlay
        this.overlay.set('bodyContent', content);
        this.overlay.show();
        // Attaches an update event to EVERY seletor shown in the compontent
        this.overlay.bodyNode.all('.tagselectorbox input.tagselector').on('click', this.update, this);
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
            this.overlay.set('bodyContent', '');
            this.overlay.hide();
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
        var content = Y.Node.create('<div class="tagselectorbox"></div>');
        // Add the tag selector
        content.append(Y.Node.create('<div class="tagname"><input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value="'+tag+'" /><label id="tagselector_'+this.selectorcount+'_label">'+tag+'<label></div>'));
        var tregex = new RegExp(tag);
        if (select != null && tregex.test(select)) {
            content.one('.tagname .tagselector').setAttribute('checked', true);
            content.one('.tagname').addClass('isselected');
        }
        // If there is an id for the node add an ID selector
        if (tagid && tagid != '' && tagid.match && !tagid.match(/^yui_\d/)) {
            // Increase the selector count VERY IMPORTANT
            this.selectorcount++;
            var iddiv = Y.Node.create('<div class="tagid"> </div>')
            var idinput = Y.Node.create('<input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value="#'+tagid+'" />');
            var idlabel = Y.Node.create('<label id="tagselector_'+this.selectorcount+'_label">#'+tagid+'<label>');
            iddiv.append(idinput).append(idlabel);
            content.append(iddiv);
            var regex = new RegExp('#'+tagid+'( |$)');
            if ((/^page\-[a-zA-Z_\-]+/.test(tagid) && tag == 'body' && select==null) || (select != null && regex.test(select))) {
                idinput.setAttribute('checked', true);
                iddiv.addClass('isselected');
            }
        }

        var propertiesdiv = Y.Node.create('<div class="tagproperties"></div>');
        var properties = ['after', 'before', 'last-child', 'first-child'];
        for (i in properties) {
            this.selectorcount++;
            var tagproperty = Y.Node.create('<div class="tagproperty"></div>');
            var tagpropertyinput = Y.Node.create('<input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value=":'+properties[i]+'" />');
            var tagpropertylabel = Y.Node.create('<label id="tagselector_'+this.selectorcount+'_label">:'+properties[i]+'<label>');
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
            var classes = Y.Node.create('<div class="tagclasses"></div>');
            for (var i in tagclasses) {
                var c = tagclasses[i];
                // Don't process if its empty or based on settings for the tool.
                if (!c || c=='' || (!this.themetool.cfg.showadvancedbodytags && tag=='body' && !c.match(/^(page|path)\-/))) {
                    continue;
                }
                // Increase the selector count VERY IMPORTANT
                this.selectorcount++;
                // Add the class as a selector
                var tagclass = Y.Node.create('<div class="tagclass"></div>');
                var tagclassinput = Y.Node.create('<input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value=".'+c+'" />');
                var tagclasslabel = Y.Node.create('<label id="tagselector_'+this.selectorcount+'_label">.'+c+'<label>');
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
        var ul = this.overlay.bodyNode.one('.style_definitions');
        // Gets the new style li
        var addnewstyle = ul.one('.addnewstyle').ancestor('li');
        // Hide it :)
        addnewstyle.addClass('hideme');
        // Create a new li
        var newstyleli = Y.Node.create('<li></li>');
        // Create an input to type the style into
        var newstyleinput = Y.Node.create('<input type="text" value="" id="nextstyleinput" />');
        // Combine
        newstyleli.append(newstyleinput);
        // Add the new LI to the UL collection
        ul.insert(newstyleli, addnewstyle);
        // Focus on the input
        newstyleinput.focus();
        // Attach an event to complete the process if Tab or Enter are pressent
        Y.on('key', this.process_style, newstyleinput, 'press:9,13', this, newstyleinput);
    },
    /**
     * Manually adds a given style to the current selector structure
     * @param {string} newstyle
     */
    manual_add_style : function(newstyle) {
        if (/[^;]$/.test(newstyle)) {
            newstyle += ';';
        }
        var li = Y.one('.css_current_selector ul.style_definitions').one('.addnewstyle').ancestor('li');
        li.ancestor().insert(this.create_style_li(newstyle, 'styleattribute'), Y.Node.getDOMNode(li));
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
            li.ancestor().insert(this.create_style_li(newstyle, 'styleattribute'), Y.Node.getDOMNode(li));
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
        if (Y.one('#nextstyleinput')) {
            this.process_style(null, Y.one('#nextstyleinput'), true);
        }

        var selector = this.get_selected_selector();
        var styles = [];
        this.overlay.bodyNode.all('.style_definitions .styleattribute').each(function(){
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
        if (this.overlay.bodyNode.all('.addnewstyle').size()<1) {
            var li = Y.Node.create('<li><span class="addnewstyle">'+M.str.block_css_theme_tool.addnewstyle+'</span></li>');
            this.overlay.bodyNode.one('.css_current_selector .style_definitions').append(li);
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
        this.overlay.bodyNode.one('.css_current_selector .selectorcontainer').set('innerHTML', selectors.join(' '));

        var l = this.overlay.bodyNode.one('.style_definitions .addnewstyle').ancestor('li');
        var ul = l.ancestor('ul');
        ul.all('.styleattribute.predefined').each(function(){
            this.ancestor('li').remove();
        });
        var currentrule = this.themetool.get_rule(rawselectors.join(' '));
        if (currentrule) {
            for (j in currentrule.styles) {
                ul.insert(this.create_style_li(currentrule.styles[j], 'styleattribute predefined'), Y.Node.getDOMNode(l));
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
        var li = Y.Node.create('<li></li>');
        var editicon = Y.Node.create('<img src="'+M.util.image_url('t/edit', 'moodle')+'" alt="edit" style="width:8px;height:8px;" class="icon" />');
        editicon.on('click', this.edit_style, this, li, style);
        var deleteicon = Y.Node.create('<img src="'+M.util.image_url('t/delete', 'moodle')+'" alt="delete" style="width:8px;height:8px;" class="icon" />');
        deleteicon.on('click', this.delete_style, this, li);
        li.append(editicon).append(deleteicon).append(Y.Node.create('<span class="'+classstr+'">'+style+'</span>'));
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
        if (Y.one('#nextstyleinput')) {
            this.process_style(null, Y.one('#nextstyleinput'), true);
        }
        li.remove();
        this.add_style(e);
        Y.one('#nextstyleinput').set('value',style);
    },
    /**
     * Gets an array of the selected selectors
     *
     * @return {array}
     */
    get_selected_selectors : function() {
        var selectors = [];
        this.overlay.bodyNode.all('.tagselectorbox').each(function(box) {
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
};

Y.extend(CSSBUILDER, Y.Base, CSSBUILDER.prototype, {
    NAME : 'css_builder',
    ATTRS : {

    }
});
Y.augment(CSSBUILDER, Y.EventTarget);

var ADDSYTLEBUTTON = function(config) {
    ADDSYTLEBUTTON.superclass.constructor.apply(this, arguments);
};
ADDSYTLEBUTTON.prototype = {
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
    initializer : function(config) {
        this.cssbuilder = config.cssbuilder;
        this.button = config.button;
        this.style = config.cssstyle;
        this.button.on('click', this.add_style, this);
    },/**
     * Adds the style to the CSS builder
     */
    add_style : function() {
        this.cssbuilder.manual_add_style(this.style);
    }
};

Y.extend(ADDSYTLEBUTTON, Y.Base, ADDSYTLEBUTTON.prototype, {
    NAME : 'moodle-block_css_theme_tool-csseditor-cssbuilder',
    ATTRS : {

    }
});

M.block_css_theme_tool.init_cssbuilder = function(config) {
    return new CSSBUILDER(config);
};

}, '@VERSION@', {"requires": ["moodle-block_css_theme_tool-csseditor", "overlay"]});
