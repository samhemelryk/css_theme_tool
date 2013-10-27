YUI.add('moodle-block_css_theme_tool-csseditor-settingss', function (Y, NAME) {

var C = Y.Node.create;

var SETTINGS = function(config) {
    SETTINGS.superclass.constructor.apply(this, arguments);
};
SETTINGS.prototype = {
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
    initializer : function(config) {
        this.themetool = config.cssthemetool;
        this.init_overlay();
        this.init_generate_content();
        config.el.on('click', this.show, this);
        this.show(config.e);
    },
    init_overlay : function() {
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
            id : 'settings-overlay'
        });
        // Render it on the body (less chance of clipping)
        this.overlay.render(bd);
        Y.one('#settings-overlay').addClass('css-theme-tool-overlay').setStyle('position', 'fixed').setStyle('margin', Math.floor(winheight*0.1)+'px 10%');
        Y.on('windowresize', function(e){
            var winheight = bd.get('winHeight');
            this.overlay.set('height', Math.floor(winheight*0.8));
            Y.one('#settings-overlay').setStyle('marginTop', Math.floor(winheight*0.1));
        });
        // Add our custom class
        this.overlay.bodyNode.addClass('css_builder_overlay');
    },
    init_generate_content : function() {
        var div = C('<div class="settingscontainer"><h2>Settings</h2></div>');

        var purge = C('<input type="button" value="'+M.str.block_css_theme_tool.purgerules+'" />');
        var purgediv = C('<div class="settingbox"></div>');
        purgediv.append(purge);
        purgediv.append(C('<div class="settingdescription">'+M.str.block_css_theme_tool.purgerulesdesc+'</div>'));
        div.append(purgediv);

        var exportcss = C('<input type="button" value="'+M.str.block_css_theme_tool.exportcss+'" />');
        var exportcssdiv = C('<div class="settingbox"></div>');
        exportcssdiv.append(exportcss);
        exportcssdiv.append(C('<div class="settingdescription">'+M.str.block_css_theme_tool.exportcssdesc+'</div>'));
        div.append(exportcssdiv);

        /**
         * To be created at a later point
         *
         * var exporttheme = C('<input type="button" value="'+M.str.block_css_theme_tool.exporttheme+'" />');
         * var exportthemediv = C('<div class="settingbox"></div>');
         * exportthemediv.append(exporttheme);
         * exportthemediv.append(C('<div class="settingdescription">'+M.str.block_css_theme_tool.exportthemedesc+'</div>'));
         * div.append(exportthemediv);
         *
         * exporttheme.on('click', this.themetool.export_theme, this.themetool);
         */


        var showadvancedbodytags = C('<input type="checkbox" value="'+M.str.block_css_theme_tool.showadvancedbodytags+'" />');
        var showadvancedbodytagsdiv = C('<div class="settingbox"></div>');
        showadvancedbodytagsdiv.append(showadvancedbodytags);
        showadvancedbodytagsdiv.append(C('<div class="settingdescription">'+M.str.block_css_theme_tool.showadvancedbodytagsdesc+'</div>'));
        div.append(showadvancedbodytagsdiv);
        if (this.themetool.cfg.showadvancedbodytags) {
            showadvancedbodytags.set('checked', true);
        }

        var autosaveonchange = C('<input type="checkbox" value="'+M.str.block_css_theme_tool.autosaveonchange+'" />');
        var autosaveonchangediv = C('<div class="settingbox"></div>');
        autosaveonchangediv.append(autosaveonchange);
        autosaveonchangediv.append(C('<div class="settingdescription">'+M.str.block_css_theme_tool.autosaveonchangedesc+'</div>'));
        div.append(autosaveonchangediv);
        if (this.themetool.cfg.autosaveonchange) {
            autosaveonchange.set('checked', true);
        }

        var onlyviewmyrules = C('<input type="checkbox" value="'+M.str.block_css_theme_tool.onlyviewmyrules+'" />');
        var onlyviewmyrulesdiv = C('<div class="settingbox"></div>');
        onlyviewmyrulesdiv.append(onlyviewmyrules);
        onlyviewmyrulesdiv.append(C('<div class="settingdescription">'+M.str.block_css_theme_tool.onlyviewmyrulesdesc+'</div>'));
        div.append(onlyviewmyrulesdiv);
        if (this.themetool.cfg.onlyviewmyrules) {
            onlyviewmyrules.set('checked', true);
        }

        var controls = C('<div class="overlaycontrols"></div>');
        var closebutton = C('<input type="button" value="'+M.str.block_css_theme_tool.close+'" />');
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
        this.overlay.set('bodyContent', this.content);
        this.overlay.show();
        this.shown = true;
    },
    /**
     * Hides the settings manager if is is being shown
     */
    hide : function() {
        if (this.shown) {
            this.overlay.hide();
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
            this.themetool.nodes.savechangesbutton.addClass('autosaveenabled');
            this.themetool.save_rules();
        } else {
            this.themetool.nodes.savechangesbutton.removeClass('autosaveenabled');
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
};

Y.extend(SETTINGS, Y.Base, SETTINGS.prototype, {
    NAME : 'moodle-block_css_theme_tool-csseditor-settings',
    ATTRS : {

    }
});
Y.augment(SETTINGS, Y.EventTarget);

M.block_css_theme_tool.init_settings = function(config) {
    return new SETTINGS(config);
};

}, '@VERSION@', {"requires": ["moodle-block_css_theme_tool-csseditor", "overlay"]});
