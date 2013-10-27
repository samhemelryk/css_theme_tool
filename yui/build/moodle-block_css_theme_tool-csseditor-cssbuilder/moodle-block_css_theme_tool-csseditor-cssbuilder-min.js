YUI.add("moodle-block_css_theme_tool-csseditor-cssbuilder",function(e,t){var n=function(e){n.superclass.constructor.apply(this,arguments)};n.prototype={shown:!1,themetool:null,mask:null,nondefaultclasses:["region-content","yui3-js-enabled"],selectorcount:0,eventmousemove:null,eventcaptureclick:null,controlsnode:null,components:[],allreadytogo:!1,overlay:null,initializer:function(t){this.themetool=t.cssthemetool;var n=e.one(document.body),r=n.get("winHeight");this.overlay=new e.Overlay({bodyContent:"temp",width:"80%",height:Math.floor(r*.8),visible:!1,zIndex:500,id:"cssbuilder-overlay"}),this.overlay.render(n),e.one("#cssbuilder-overlay").addClass("css-theme-tool-overlay").setStyle("position","fixed").setStyle("margin",Math.floor(r*.1)+"px 10%"),e.on("windowresize",function(t){var r=n.get("winHeight");this.overlay.set("height",Math.floor(r*.8)),e.one("#cssbuilder-overlay").setStyle("marginTop",Math.floor(r*.1))},this),this.overlay.bodyNode.addClass("css_builder_overlay"),this.mask=new e.Overlay({bodyContent:" ",width:"100%",height:"100%",visible:!1,xy:[0,0]}),this.mask.render(e.one(document.body));var i=this.mask.bodyNode.ancestor(".yui3-overlay");i&&(i.setStyle("opacity","0.0"),i.setStyle("cursor","crosshair"),i.setStyle("position","fixed")),t.el.on("click",this.capture_next_click,this),this.capture_next_click(t.e)},capture_next_click:function(){this.init_generate_controls(),this.themetool.hide_components(),this.mask.show();var t=e.one("#mousemovetrackdiv")||function(e){var t=e.Node.create('<div id="mousemovetrackdiv"><div class="inner-border"><div class="inner-background"></div></div></div>');return t.setStyle("opacity",.4),e.one(document.body).append(t),t}(e);t.setStyle("visibility","visible"),this.eventcaptureclick=t.on("click",this.capture_click,this),this.eventmousemove=e.one(document.body).on("mousemove",this.highlight_cell_below_event,this,t)},capture_click:function(t){t.halt(),this.eventmousemove.detach(),this.eventcaptureclick.detach(),e.one("#mousemovetrackdiv").setStyle("visibility","hidden"),this.mask.hide();try{var n=e.one(document.elementFromPoint(t.clientX,t.clientY))}catch(r){alert(M.str.block_css_theme_tool.errorcapturingclick+r.message);return}this.show(n)},highlight_cell_below_event:function(t,n){this.mask.hide(),n.setStyle("visibility","hidden");var r=e.one(document.elementFromPoint(t.clientX,t.clientY));n.setStyle("visibility","visible"),this.mask.show();var i=r.getXY();n.setXY(i),n.setStyle("width",r.get("offsetWidth")+"px"),n.setStyle("height",r.get("offsetHeight")+"px"),n.one(".inner-border").setStyle("width",r.get("offsetWidth")-12+"px").setStyle("height",r.get("offsetHeight")-12+"px");return;var s,o},highlight_affected_cells:function(t){var n=e.Node.create('<div class="cssbuilder_highlight_container"></div>');e.one(document.body).append(n),n.append(e.Node.create('<div class="cssbuilder_bodywash"></div>')),e.all(this.get_selected_selector()).each(function(t){var r=e.Node.create('<div class="cssbuilder_cellhighlight"></div>');r.setXY(t.getXY()),r.setStyle("position","absolute"),r.setStyle("width",t.get("offsetWidth")+"px"),r.setStyle("height",t.get("offsetHeight")+"px"),r.setStyle("opacity",.9),n.append(r)},this)},preview_affected_cells:function(t){e.one("#nextstyleinput")&&this.process_style(null,e.one("#nextstyleinput"),!0);var n=this.get_selected_selector(),r=[];this.overlay.bodyNode.all(".style_definitions .styleattribute").each(function(){r.push(this.get("innerHTML"))}),this.themetool.previewtag.setContent(n+" {"+r.join("")+"}")},init_generate_controls:function(){if(this.allreadytogo)return!0;if(this.controlsnode==null){var t=e.Node.create,n=M.str.block_css_theme_tool,i=M.block_css_theme_tool,s=t('<div class="css_selector_controls"></div>');s.append(t('<div class="control colourpicker" title="'+n.fontcolour+'"> </div>')),s.append(t('<div class="control backgroundcolourpicker" title="'+n.backgroundcolour+'"> </div>')),s.append(t('<div class="control bold" title="'+n.bold+'"> </div>')),s.append(t('<div class="control italic" title="'+n.italic+'"> </div>')),s.append(t('<div class="control underline" title="'+n.underline+'"> </div>')),s.append(t('<div class="control alignleft" title="'+n.alignleft+'"> </div>')),s.append(t('<div class="control aligncenter" title="'+n.aligncenter+'"> </div>')),s.append(t('<div class="control alignright" title="'+n.alignright+'"> </div>')),s.append(t('<div class="control roundedcorners" title="'+n.roundedcorners+'"> </div>')),s.append(t('<div class="control opacity" title="'+n.opacity+'"> </div>'));var o=t('<div class="paramcenter"></div>');o.append(t('<input type="button" id="highlightaffectedcells" value="'+n.highlight+'" />')),o.append(t('<input type="button" id="previewaffectedcells" value="'+n.preview+'" />')),o.append(t('<input type="button" id="viewthepage" value="'+n.viewthepage+'" />')),o.append(t('<input id="commitnewstyle" type="button" value="'+n.save+'" />')),o.append(t('<input id="cancelnewstyle" type="button" value="'+n.cancel+'" />')),o.one("#commitnewstyle").on("click",this.save,this),o.one("#cancelnewstyle").on("click",this.hide,this),o.one("#highlightaffectedcells").on("mousedown",function(){this.highlight_affected_cells(),this.overlay.bodyNode.setStyle("opacity",.2)},this),o.one("#highlightaffectedcells").on("mouseup",function(){this.overlay.bodyNode.setStyle("opacity",1),e.all(".cssbuilder_highlight_container").remove()},this),o.one("#previewaffectedcells").on("mousedown",function(){this.preview_affected_cells(),this.overlay.bodyNode.setStyle("opacity",.2)},this),o.one("#previewaffectedcells").on("mouseup",function(){this.overlay.bodyNode.setStyle("opacity",1),this.themetool.previewtag.setContent("")},this),o.one("#viewthepage").on("mousedown",function(){this.setStyle("opacity",.2)},this.overlay.bodyNode),o.one("#viewthepage").on("mouseup",function(){this.setStyle("opacity",1)},this.overlay.bodyNode),s.append(o),this.prepare_component_use(s.one(".control.colourpicker"),"color","moodle-block_css_theme_tool-csseditor-colourpicker"
,"init_colour_picker",[{cssbuilder:this,button:s.one(".control.colourpicker"),cssstyle:"color"}]),this.prepare_component_use(s.one(".control.backgroundcolourpicker"),"backgroundcolor","moodle-block_css_theme_tool-csseditor-colourpicker","init_colour_picker",[{cssbuilder:this,button:s.one(".control.backgroundcolourpicker"),cssstyle:"background-color"}]),this.prepare_component_use(s.one(".control.roundedcorners"),"roundedcorners","moodle-block_css_theme_tool-csseditor-dialogueroundedcorners","init_rounded_corners",[{cssbuilder:this,button:s.one(".control.roundedcorners")}]),this.prepare_component_use(s.one(".control.opacity"),"opacity","moodle-block_css_theme_tool-csseditor-dialogueopacity","init_dialogue_opacity",[{cssbuilder:this,button:s.one(".control.opacity")}]),this.components.bold=new r({cssbuilder:this,button:s.one(".control.bold"),cssstyle:"font-weight: bold;"}),this.components.italic=new r({cssbuilder:this,button:s.one(".control.italic"),cssstyle:"font-style: italic;"}),this.components.underline=new r({cssbuilder:this,button:s.one(".control.underline"),cssstyle:"text-decoration: underline;"}),this.components.alignleft=new r({cssbuilder:this,button:s.one(".control.alignleft"),cssstyle:"text-align: left;"}),this.components.aligncenter=new r({cssbuilder:this,button:s.one(".control.aligncenter"),cssstyle:"text-align: center;"}),this.components.alignright=new r({cssbuilder:this,button:s.one(".control.alignright"),cssstyle:"text-align: right;"}),this.controlsnode=s}return this.allreadytogo=!0,this.controlsnode},prepare_component_use:function(t,n,r,i,s){this.components[n]=t.on("click",function(t){t.halt(),this.components[n].detach();var o=this;e.use(r,function(e){o.components[n]=M.block_css_theme_tool[i].apply(M.block_css_theme_tool,s),o.components[n].show(t)})},this)},show:function(t){this.themetool.hide_components();var n=e.Node.create('<div class="css_builder"></div>'),r=e.Node.create('<div class="css_selectors"></div>'),i=[];this.selectorcount=0;var s=null;if(arguments.length>1)var s=arguments[1];while(t)i.push(this.generate_selectors_for_node(t,s)),t=t.ancestor();i.reverse();for(var o in i)r.append(i[o]);n.append(r),n.append(e.Node.create('<div class="css_current_selector"><div class="selectorcontainer"></div>{<ul class="style_definitions"></ul>}</div>')),n.append(this.controlsnode),this.overlay.set("bodyContent",n),this.overlay.show(),this.overlay.bodyNode.all(".tagselectorbox input.tagselector").on("click",this.update,this),this.update(),this.shown=!0},hide:function(){this.shown&&(this.themetool.previewtag.setContent(""),this.overlay.set("bodyContent",""),this.overlay.hide(),this.shown=!1)},generate_selectors_for_node:function(t,n){var r=t.get("nodeName").toLowerCase(),i=t.getAttribute("id"),s=t.get("className").split(" "),o=e.Node.create('<div class="tagselectorbox"></div>');o.append(e.Node.create('<div class="tagname"><input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value="'+r+'" /><label id="tagselector_'+this.selectorcount+'_label">'+r+"<label></div>"));var u=new RegExp(r);n!=null&&u.test(n)&&(o.one(".tagname .tagselector").setAttribute("checked",!0),o.one(".tagname").addClass("isselected"));if(i&&i!=""&&i.match&&!i.match(/^yui_\d/)){this.selectorcount++;var a=e.Node.create('<div class="tagid"> </div>'),f=e.Node.create('<input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value="#'+i+'" />'),l=e.Node.create('<label id="tagselector_'+this.selectorcount+'_label">#'+i+"<label>");a.append(f).append(l),o.append(a);var c=new RegExp("#"+i+"( |$)");if(/^page\-[a-zA-Z_\-]+/.test(i)&&r=="body"&&n==null||n!=null&&c.test(n))f.setAttribute("checked",!0),a.addClass("isselected")}var h=e.Node.create('<div class="tagproperties"></div>'),p=["after","before","last-child","first-child"];for(b in p){this.selectorcount++;var d=e.Node.create('<div class="tagproperty"></div>'),v=e.Node.create('<input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value=":'+p[b]+'" />'),m=e.Node.create('<label id="tagselector_'+this.selectorcount+'_label">:'+p[b]+"<label>"),g=new RegExp(":"+p[b]);n!=null&&g.test(n)&&(d.addClass("isselected"),v.set("checked",!0)),d.append(v),d.append(m),h.append(d)}o.append(h);if(s&&s.length>0){var y=e.Node.create('<div class="tagclasses"></div>');for(var b in s){var w=s[b];if(!w||w==""||!this.themetool.cfg.showadvancedbodytags&&r=="body"&&!w.match(/^(page|path)\-/))continue;this.selectorcount++;var E=e.Node.create('<div class="tagclass"></div>'),S=e.Node.create('<input class="tagselector" type="checkbox" id="tagselector_'+this.selectorcount+'" value=".'+w+'" />'),x=e.Node.create('<label id="tagselector_'+this.selectorcount+'_label">.'+w+"<label>"),T=new RegExp("\\."+w);if(n==null&&b==0&&!M.util.in_array(w,this.nondefaultclasses)||n!=null&&T.test(n))E.addClass("isselected"),S.set("checked",!0);E.append(S),E.append(x),y.append(E)}o.append(y)}return this.selectorcount++,o},add_style:function(t){var n=this.overlay.bodyNode.one(".style_definitions"),r=n.one(".addnewstyle").ancestor("li");r.addClass("hideme");var i=e.Node.create("<li></li>"),s=e.Node.create('<input type="text" value="" id="nextstyleinput" />');i.append(s),n.insert(i,r),s.focus(),e.on("key",this.process_style,s,"press:9,13",this,s)},manual_add_style:function(t){/[^;]$/.test(t)&&(t+=";");var n=e.one(".css_current_selector ul.style_definitions").one(".addnewstyle").ancestor("li");n.ancestor().insert(this.create_style_li(t,"styleattribute"),e.Node.getDOMNode(n))},process_style:function(t,n,r){var i=n.get("value"),s=n.ancestor("ul").one(".addnewstyle").ancestor("li"),o=r===!0;i.match(/^[^:]+:.*$/)?(/[^;]$/.test(i)&&(i+=";"),s.ancestor().insert(this.create_style_li(i,"styleattribute"),e.Node.getDOMNode(s)),n.set("value","")):i.match(/^\s*$/)&&(o=!0),o&&(s.removeClass("hideme"),n.remove())},save:function(){e.one("#nextstyleinput")&&this.process_style(null,e.one("#nextstyleinput"),!0);var t=this.get_selected_selector(),n=[];this.overlay.bodyNode
.all(".style_definitions .styleattribute").each(function(){n.push(this.get("innerHTML"))}),this.themetool.add_rule(t,n)?this.hide():alert("Unable to save the rule")},update:function(){if(this.overlay.bodyNode.all(".addnewstyle").size()<1){var t=e.Node.create('<li><span class="addnewstyle">'+M.str.block_css_theme_tool.addnewstyle+"</span></li>");this.overlay.bodyNode.one(".css_current_selector .style_definitions").append(t),t.on("click",this.add_style,this)}var n=this.get_selected_selectors(),r=[],i=[];for(var s in n){var o=[],u=[];for(var a in n[s])u.push(n[s][a].get("value")),o.push('<span class="'+n[s][a].ancestor().get("className")+'">'+n[s][a].get("value")+"</span>");r.push(o.join("")),i.push(u.join(""))}this.overlay.bodyNode.one(".css_current_selector .selectorcontainer").set("innerHTML",r.join(" "));var f=this.overlay.bodyNode.one(".style_definitions .addnewstyle").ancestor("li"),l=f.ancestor("ul");l.all(".styleattribute.predefined").each(function(){this.ancestor("li").remove()});var c=this.themetool.get_rule(i.join(" "));if(c)for(a in c.styles)l.insert(this.create_style_li(c.styles[a],"styleattribute predefined"),e.Node.getDOMNode(f))},create_style_li:function(t,n){var r=e.Node.create("<li></li>"),i=e.Node.create('<img src="'+M.util.image_url("t/edit","moodle")+'" alt="edit" style="width:8px;height:8px;" class="icon" />');i.on("click",this.edit_style,this,r,t);var s=e.Node.create('<img src="'+M.util.image_url("t/delete","moodle")+'" alt="delete" style="width:8px;height:8px;" class="icon" />');return s.on("click",this.delete_style,this,r),r.append(i).append(s).append(e.Node.create('<span class="'+n+'">'+t+"</span>")),r},delete_style:function(e,t){t.remove()},edit_style:function(t,n,r){e.one("#nextstyleinput")&&this.process_style(null,e.one("#nextstyleinput"),!0),n.remove(),this.add_style(t),e.one("#nextstyleinput").set("value",r)},get_selected_selectors:function(){var e=[];return this.overlay.bodyNode.all(".tagselectorbox").each(function(t){var n=[];t.all("input.tagselector").each(function(e){e.ancestor().removeClass("isselected"),e.get("checked")&&(e.ancestor().addClass("isselected"),n.push(e))},this),n.length>0&&e.push(n)},this),e},get_selected_selector:function(){var e=this.get_selected_selectors(),t="";for(var n in e){for(var r in e[n])t+=e[n][r].get("value");t+=" "}return t}},e.extend(n,e.Base,n.prototype,{NAME:"css_builder",ATTRS:{}}),e.augment(n,e.EventTarget);var r=function(e){r.superclass.constructor.apply(this,arguments)};r.prototype={cssbuilder:null,button:null,style:null,initializer:function(e){this.cssbuilder=e.cssbuilder,this.button=e.button,this.style=e.cssstyle,this.button.on("click",this.add_style,this)},add_style:function(){this.cssbuilder.manual_add_style(this.style)}},e.extend(r,e.Base,r.prototype,{NAME:"moodle-block_css_theme_tool-csseditor-cssbuilder",ATTRS:{}}),M.block_css_theme_tool.init_cssbuilder=function(e){return new n(e)}},"@VERSION@",{requires:["moodle-block_css_theme_tool-csseditor","overlay"]});
