YUI.add('moodle-block_css_theme_tool-csseditor-cssviewer', function (Y, NAME) {

var CSSVIEWER = function(config) {
    CSSVIEWER.superclass.constructor.apply(this, arguments);
};
CSSVIEWER.prototype = {
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
     * Used by all components to display their content nicely
     * @var {YUI.Overlay}
     */
    overlay : null,
    /**
     * Initialise this new object
     */
    initializer : function(config) {
        this.themetool = config.cssthemetool;

        // Prepare the required overlay
        var bd = Y.one(document.body);
        var winheight = bd.get('winHeight');
        // Instantiate the overlay
        this.overlay = new Y.Overlay({
            bodyContent : 'temp',
            width: '80%',
            height : Math.floor(winheight*0.8),
            visible : false,
            zIndex : 500,
            id : 'cssviewer-overlay'
        });
        // Render it on the body (less chance of clipping)
        this.overlay.render(bd);
        Y.one('#cssviewer-overlay').addClass('css-theme-tool-overlay').setStyle('position', 'fixed').setStyle('margin', Math.floor(winheight*0.1)+'px 10%');
        Y.on('windowresize', function(e){
            var winheight = bd.get('winHeight');
            this.overlay.set('height', Math.floor(winheight*0.8));
            Y.one('#cssviewer-overlay').setStyle('marginTop', Math.floor(winheight*0.1));
        });
        // Add our custom class
        this.overlay.bodyNode.addClass('css_builder_overlay');

        // Attach the event to display the CSS
        config.el.on('click', this.show, this);
        this.show(config.e);
    },
    /**
     * Shows the CSS viewer component
     */
    show : function (e) {
        // First hide all other components (they may be using the dialogue)
        this.themetool.hide_components();
        // Create the content div for the CSS viewer
        var content = Y.Node.create('<div class="viewcssbox"></div>');
        for (var i in this.themetool.rules) {
            // Create the HTML for each rule so we can show it
            var r = this.themetool.rules[i];
            var selector = Y.Node.create('<div class="cssrule"></div>');
            var editicon = Y.Node.create('<img src="'+M.util.image_url('t/edit', 'moodle')+'" alt="edit" style="width:11px;height:11px;" class="icon" />');
            var deleteicon = Y.Node.create('<img src="'+M.util.image_url('t/delete', 'moodle')+'" alt="delete" style="width:11px;height:11px;" class="icon" />');
            selector.append(editicon);
            selector.append(deleteicon);
            selector.append(Y.Node.create('<span class="selector">'+r.selector+'</span> {'+r.styles.join('')+'}'));
            // Add it to the content div
            content.append(selector);
            // Attach the edit event
            editicon.on('click', this.edit_rule, this, r);
            // Attach the delete event
            deleteicon.on('click', this.delete_rule, this, r);
        }
        // Setup the theme tools overlays as we require
        this.overlay.set('bodyContent', content);
        this.overlay.show();
        // Attach the close event to a click anywhere on the overlay
        this.eventcloseoverlay = this.overlay.bodyNode.on('click', this.hide, this);
        this.shown = true;
    },
    /**
     * Hides the CSS viewer component if it is being shown
     */
    hide : function () {
        if (this.shown) {
            this.eventcloseoverlay.detach();
            this.overlay.hide();
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
};

Y.extend(CSSVIEWER, Y.Base, CSSVIEWER.prototype, {
    NAME : 'moodle-block_css_theme_tool-csseditor-cssviewer',
    ATTRS : {
        
    }
});
Y.augment(CSSVIEWER, Y.EventTarget);

M.block_css_theme_tool.init_cssviewer = function(config) {
    return new CSSVIEWER(config);
};

}, '@VERSION@', {"requires": ["moodle-block_css_theme_tool-csseditor", "overlay"]});
