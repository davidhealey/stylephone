/*
    Copyright 2019 David Healey

    This file is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

Content.makeFrontInterface(650, 570);

include("settings.js");
include("preloadBar.js");

Synth.deferCallbacks(true);

//Fonts
Engine.loadFontAs("{PROJECT_FOLDER}Fonts/oxygen.regular.ttf", "Oxygen-Regular");
Engine.loadFontAs("{PROJECT_FOLDER}Fonts/oxygen.light.ttf", "Oxygen-Light");
Engine.loadFontAs("{PROJECT_FOLDER}Fonts/oxygen.bold.ttf", "Oxygen-Bold");

//Value popup styling
Content.setValuePopupData(
{
    "fontName": "Oxygen-Bold",
    "fontSize": 18,
    "itemColour": 0xFFDDDDDD,
    "itemColour2": 0xFFDDDDDD,
    "textColour": 0xFF3E3E3E,
    "borderSize": 0
});

//Menu and pages
const var pnlMenu = Content.getComponent("pnlMenu");
const var menuLabels = ["OUTPUT", "VELOCITY", "EQUALIZER", "CHORUS", "VIBRATO", "SETTINGS"];
pnlMenu.data.numRows = menuLabels.length;
pnlMenu.data.itemHeight = (pnlMenu.getHeight() / menuLabels.length); //Calculate menu item height

//Add pages to array
const var pages = [];
for (i = 0; i < menuLabels.length; i++)
{
    pages[i] = Content.getComponent("page"+i);
}

//Menu paint routine
pnlMenu.setPaintRoutine(function(g){
    
    g.fillAll(0x00);
        
    for (i = 0; i < menuLabels.length; i++)
    {
        i == this.getValue() ? g.setColour(0xFFFFFFFFF) : g.setColour(0xFFDDDDDD);
        i == this.getValue() ? g.setFont("Oxygen-Bold", 20) : g.setFont("Oxygen-Regular", 20);    
        g.drawAlignedText(menuLabels[i], [0, ((this.data.itemHeight)*i), this.getWidth(), this.data.itemHeight], "left");
    }
});

//Menu mouse callback
pnlMenu.setMouseCallback(function(event)
{
    if (event.clicked)
    {
        var height = (this.data.itemHeight * this.data.numRows);
        var value = parseInt(event.y / height * this.data.numRows);
        
        pnlMenu.setValue(value);
        pnlMenu.repaint();
        changePage(value);
    }
});

inline function changePage(p)
{
    for (i = 0; i < pages.length; i++)
    {
        pages[i].showControl(i == p);
    }
}

//Vibrato UI
const var pnlXY = Content.getComponent("pnlXY"); //XY Pad
const var vibMods = []; //CC Modulators
const var knbVibrato = []; //Sliders

for (i = 0; i < 2; i++)
{
    vibMods[i] = Synth.getModulator("vibratoMod"+i);
    knbVibrato[i] = Content.getComponent("knbVibrato"+i);
    knbVibrato[i].setControlCallback(onVibratoSlider);
}

inline function onVibratoSlider(component, value)
{
    //Set modulator value
    for (i = 0; i < vibMods.length; i++)
    {
        vibMods[i].setAttribute(vibMods[i].DefaultValue, knbVibrato[i].getValue());
    }
    
    //Update XY pad
    pnlXY.changed();
    pnlXY.repaint();
}

pnlXY.setPaintRoutine(function(g){   
    
    //Background
    g.fillAll(this.get("bgColour"));
    
    //Get knob values as normalized percentage
    var intensity = knbVibrato[0].getValue() / 127;
    var rate = 1 - (knbVibrato[1].getValue() / 127);
   
    //Calculate dot position
    var x = Math.range(intensity * (this.getWidth()-10), 0, this.getWidth()-10);
    var y = Math.range(rate * (this.getHeight()-10), 0, this.getHeight()-10);
           
    //Draw dot
    g.setColour(this.get("itemColour"));
    g.fillEllipse([x, y, 10, 10]);
});

pnlXY.setMouseCallback(function(event)
{
    if (event.clicked || event.drag)
    {       
        //Calculate new knob value normalized percentage
        var x = Math.range(event.x / this.getWidth(), 0, 1);
        var y = Math.range(event.y / this.getHeight(), 0, 1);
        
        //Update knob values
        knbVibrato[0].setValue(127 * x);
        knbVibrato[1].setValue(127-(127 * y));
        
        //Trigger knob callback to update modulators and repaint panel
        knbVibrato[0].changed();
        knbVibrato[1].changed();
    }
});


//Patch selector
const var sampler1 = Synth.getSampler("sampler1");

reg patch;

Content.getComponent("cmbPatches").setControlCallback(oncmbPatchesControl);
inline function oncmbPatchesControl(component, value)
{
	patch = component.getItemText();
	colourKeys();
	loadSampleMaps();
	pnlPreset.showControl(false);
	btnPreset2.setValue(false);
	
    if(Engine.getCurrentUserPresetName() == "")
        Content.getComponent("lblPreset").set("text", "Sound 1");
    else
        Content.getComponent("lblPreset").set("text", Engine.getCurrentUserPresetName());
};

//Set keyboard colours
inline function colourKeys()
{    
    local ranges = Manifest.patches[patch].range;
    
    for (i = 0; i < 128; i++)
    {
        if (i >= 57 && i <= 81)
            Engine.setKeyColour(i, Colours.withAlpha(Colours.green, 1));
    }   
}

//Load sample maps
inline function loadSampleMaps()
{
    local sampleMaps = Sampler.getSampleMapList();

    if (sampleMaps.contains(patch)) //Valid sample map for sampler ID
    {
        sampler1.loadSampleMap(patch); //Load the sample map
    }
    else //No sample map found
    {
        sampler1.loadSampleMap("empty"); //Load empty sample map for this sampler
    }
}

//Preset handling
const var btnPreset = [];
btnPreset[0] = Content.getComponent("btnPreset0");
btnPreset[1] = Content.getComponent("btnPreset1");
btnPreset[0].setControlCallback(changePreset);
btnPreset[1].setControlCallback(changePreset);

inline function changePreset(component, value)
{
    if (value == 1)
    {
        local idx = btnPreset.indexOf(component);
        idx == 0 ? Engine.loadPreviousUserPreset(false) : Engine.loadNextUserPreset(false);
    }
}

const var btnPreset2 = Content.getComponent("btnPreset2");
btnPreset2.setControlCallback(openPresetBrowser);
const var pnlPreset = Content.getComponent("pnlPreset");

inline function openPresetBrowser(component, value)
{
    pnlPreset.showControl(value);
}function onNoteOn()
{
	
}
 function onNoteOff()
{
	
}
 function onController()
{
	
}
 function onTimer()
{
	
}
 function onControl(number, value)
{
	
}
 