YUI.add("moodle-block_css_theme_tool-csseditor-dialogueopacity",function(e,t){var n=function(e){n.superclass.constructor.apply(this,arguments)};n.prototype={cssbuilder:null,initializer:function(e){this.cssbuilder=e.cssbuilder,e.button.on("click",this.show,this)},show:function(e){var t=prompt(M.str.block_css_theme_tool.opacityprompt);t=t.replace(/^0?\./,""),t=t.replace(/\%$/,""),t.match(/^(\d{1,2}|100)$/)&&(this.cssbuilder.manual_add_style("-moz-opacity: ."+t),this.cssbuilder.manual_add_style("filter: alpha(opacity="+t+")"),this.cssbuilder.manual_add_style("opacity: ."+t))}},e.extend(n,e.Base,n.prototype,{NAME:"moodle-block_css_theme_tool-csseditor-opacity",ATTRS:{}}),e.augment(n,e.EventTarget),M.block_css_theme_tool.init_dialogue_opacity=function(e){return new n(e)}},"@VERSION@",{requires:["moodle-block_css_theme_tool-csseditor"]});