var BUTTON_PRIMARY = 0;
var BUTTON_SECONDARY = 1;
var BUTTON_TERTIARY = 2;
var BUTTON_QUATERNARY = 3;
var BUTTON_LEFT_SHOULDER = 4;
var BUTTON_RIGHT_SHOULDER = 5;
var BUTTON_LEFT_TRIGGER = 6;
var BUTTON_RIGHT_TRIGGER = 7;
var BUTTON_BACK_SELECT = 8;
var BUTTON_START = 9;
var BUTTON_LEFT_THUMBSTICK = 10;
var BUTTON_RIGHT_THUMBSTICK = 11;
var BUTTON_DPAD_UP = 12;
var BUTTON_DPAD_DOWN = 13;
var BUTTON_DPAD_LEFT = 14;
var BUTTON_DPAD_RIGHT = 15;
var BUTTON_META = 16;

var AXIS_LSTICK_X = 0;
var AXIS_LSTICK_Y = 1;
var AXIS_RSTICK_X = 2;
var AXIS_RSTICK_Y = 3;

var PAD_COUNT = 1;
var STANDARD_GAMEPAD_TRIGGER_COUNT = 2;
var STANDARD_GAMEPAD_STICK_COUNT = 2;
var STANDARD_GAMEPAD_BUTTON_COUNT = (BUTTON_META - BUTTON_PRIMARY + 1);

var DEADZONE_RADIUS = 0.1;
var CENTERING_TIMEOUT_MILLIS = 3000;

var RADIANS_TO_DEGREES = 180 / Math.PI;

var PRIMARY_STYLE = '#009939';
var SECONDARY_STYLE = '#d50f25';
var TERTIARY_STYLE = '#3369e8';
var QUATERNARY_STYLE = '#eeb211';

var BACKGROUND_STYLE = '#fff';
var OUTLINE_STYLE = '#eee';
var DARK_OUTLINE_STYLE = '#333';
var FOREGROUND_STYLE = '#787878';

var ACTIVE_STYLE = TERTIARY_STYLE;
var TOUCHED_STYLE = FOREGROUND_STYLE;
var COMPLETE_STYLE = DARK_OUTLINE_STYLE;
var ALMOST_COMPLETE_STYLE = QUATERNARY_STYLE;
var INCOMPLETE_STYLE = SECONDARY_STYLE;
var PRESSED_STYLE = SECONDARY_STYLE;
var POSITIVE_STYLE = TERTIARY_STYLE;
var NEGATIVE_STYLE = SECONDARY_STYLE;

var scale = 2.0;
var GAMEPAD_WIDTH = scale * 200.0;
var GAMEPAD_HEIGHT = scale * 200.0;
var ACTION_BUTTON_GROUP_SIZE = scale * 65.0;
var BUTTON_RADIUS = scale * 10.0;
var DPAD_SIZE = scale * 60.0;
var DPAD_PAD_WIDTH = DPAD_SIZE / 3.3;
var STICK_RADIUS = scale * 20.0;
var HEAD_RADIUS = scale * 5.0;

var TRIGGER_WIDTH = scale * 16.0;
var TRIGGER_HEIGHT = scale * 24.0;
var SHOULDER_WIDTH = scale * 28.0;
var SHOULDER_HEIGHT = scale * 12.0;
var SELECT_START_WIDTH = scale * 20.0;
var SELECT_START_HEIGHT = scale * 10.0;
var TABLE_WIDTH = scale * 180.0;
var TABLE_HEIGHT = scale * 10.0;

var XPCT_LEFT_COLUMN = 0.25;
var XPCT_CENTER_COLUMN = 0.5;
var XPCT_RIGHT_COLUMN = 0.75;

var YPCT_TRIGGERS_TOP = 0.07;
var YPCT_SHOULDERS_TOP = 0.225;
var YPCT_STICKS_CENTER = 0.425;
var YPCT_START_SELECT_TOP = 0.55;
var YPCT_DPAD_ACTION_BUTTON_CENTER = 0.75;

var DRAG_NONE = 0;
var DRAG_AXIS = 1;
var DRAG_BUTTON = 2;

var lastmousex = 0;
var lastmousey = 0;

var isdragging = false;
var dragx = 0;
var dragy = 0;
var dragitemtype = DRAG_NONE;
var dragitempadindex = -1;
var dragitembuttonaxisindex = -1;

var hastooltip = false;
var tooltippadindex = 0;
var tooltipbuttonaxisindex = 0;

var frame = 0;

function initpadstate() {
  var now = new Date(0);
  var padstate = [];
  for (var i = 0; i < PAD_COUNT; ++i) {
    var state = {};
    state.timestamp = 0;
    state.lastseen = now;
  
    state.sticks = [];
    for (var j = 0; j < STANDARD_GAMEPAD_STICK_COUNT; ++j) {
      var stick = {};
      stick.lastchanged = now;
      stick.lastzero = now;
      stick.lastnonzero = now;
      stick.centered = false;
      stick.hull = [];
      stick.idlehull = [];
      stick.clickcomplete = false;
      stick.hullprogress = 0;
      stick.hullcomplete = false;
      stick.complete = false;
      state.sticks.push(stick);
    }

    state.triggers = [];
    for (j = 0; j < STANDARD_GAMEPAD_TRIGGER_COUNT; ++j) {
      var trigger = {};
      trigger.lastchanged = now;
      trigger.lastzero = now;
      trigger.lastnonzero = now;
      trigger.lastmax = now;
      trigger.zerovalue = 1.0;
      trigger.maxvalue = 0.0;
      trigger.minseenvalue = 1.0;
      trigger.maxseenvalue = 0.0;
      trigger.complete = false;
      state.triggers.push(trigger);
    }

    state.buttons = [];
    for (j = 0; j < STANDARD_GAMEPAD_BUTTON_COUNT; ++j) {
      var button = {};
      button.lastchanged = now;
      button.lastdown = now;
      button.lastup = now;
      button.digital = true;
      button.zerovalue = 1.0;
      button.maxvalue = 1.0;
      button.minseenvalue = 1.0;
      button.maxseenvalue = 0.0;
      button.digitalcomplete = false;
      button.analogcomplete = false;
      state.buttons.push(button);
    }

    state.progress = 0;
    state.maxprogress = state.sticks.length + state.triggers.length + state.buttons.length;

    padstate.push(state);
  }
  return padstate;
}

function addpointtohull(hull, x, y) {
  var point = {};
  // The convex hull algorithm works better when there are no ties.
  point.x = x + Math.abs(y + 0.000001) * 0.000001;
  point.y = y + Math.abs(x + 0.000001) * 0.000001;
  hull[hull.length] = point;
  hull.sort(sortPointY);
  hull.sort(sortPointX);

  var newhull = [];
  chainHull_2D(hull, hull.length, newhull);
  
  return newhull;
}

function drawrectangle(context, x, y, width, height, fillStyle) {
  context.beginPath();
  context.rect(x, y, width, height);
  context.fillStyle = fillStyle;
  context.fill();
}

function drawhull(hull, context, centerx, centery) {
  if (hull.length > 2) {
    var p1 = hull[hull.length - 1];
    for (var i = 0; i < hull.length; ++i) {
      var p2 = hull[i];

      var hullstyle = COMPLETE_STYLE;

      var segmentlength = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
      if (segmentlength > 0.0) {
        // compute the min distance from the (line containing the) hull segment to the center.
        var rmax = Math.abs((p2.x - p1.x) * (p1.y - 0.0) - (p1.x - 0.0) * (p2.y - p1.y)) / segmentlength;
        if (rmax < 0.5) hullstyle = INCOMPLETE_STYLE;
        else if (rmax < 0.999) hullstyle = ALMOST_COMPLETE_STYLE;
      }
      
      context.beginPath();
      context.moveTo(centerx + STICK_RADIUS * p1.x, centery + STICK_RADIUS * p1.y);
      context.lineTo(centerx + STICK_RADIUS * p2.x, centery + STICK_RADIUS * p2.y);
      context.lineWidth = scale;
      context.strokeStyle = hullstyle;
      context.stroke();
      
      p1 = p2;
    }
  }
}

function drawstick(stick, context, centerx, centery) {
  var style = ACTIVE_STYLE;
  if (stick.zero) style = FOREGROUND_STYLE;
  if (stick.click) style = PRESSED_STYLE;
  
  context.beginPath();
  context.arc(centerx, centery, STICK_RADIUS, 0, 2 * Math.PI, false);
  context.fillStyle = OUTLINE_STYLE;
  context.fill();
  
  var headx = centerx + (STICK_RADIUS - HEAD_RADIUS + scale) * stick.x;
  var heady = centery + (STICK_RADIUS - HEAD_RADIUS + scale) * stick.y;

  if (!stick.zero && !isNaN(stick.x) && !isNaN(stick.y)) {
    var i = Math.floor((stick.angle - 0.125 * Math.PI) * 4.0 / Math.PI);
    var anglestart = (i * 0.25 + 0.125) * Math.PI;
    var angleend = anglestart + 0.25 * Math.PI;
    
    context.beginPath();
    context.arc(centerx, centery, 0.5 * STICK_RADIUS, anglestart, angleend, false);
    context.strokeStyle = FOREGROUND_STYLE;
    context.fillStyle = FOREGROUND_STYLE;
    context.lineWidth = 3 * scale;
    context.stroke();
    context.fill();
    
    context.beginPath();
    context.moveTo(centerx, centery);
    context.lineTo(centerx + 0.5 * STICK_RADIUS * Math.cos(anglestart),
                   centery + 0.5 * STICK_RADIUS * Math.sin(anglestart));
    context.lineTo(centerx + 0.5 * STICK_RADIUS * Math.cos(angleend),
                   centery + 0.5 * STICK_RADIUS * Math.sin(angleend));
    context.lineTo(centerx, centery);
    context.fillStyle = FOREGROUND_STYLE;
    context.fill();
    
    if (stick.magnitude > 0.5) {
      context.beginPath();
      context.arc(centerx, centery, 0.7 * STICK_RADIUS, anglestart, angleend, false);
      context.strokeStyle = FOREGROUND_STYLE;
      context.lineWidth = 3 * scale;
      context.stroke();
    }
    
    if (stick.magnitude >= 1.0) {
      context.beginPath();
      context.arc(centerx, centery, 0.9 * STICK_RADIUS, anglestart, angleend, false);
      context.strokeStyle = FOREGROUND_STYLE;
      context.lineWidth = 3 * scale;
      context.stroke();
    }
  
    context.beginPath();
    context.moveTo(centerx, centery);
    context.lineTo(headx, heady);
    context.lineWidth = 3 * scale;
    context.strokeStyle = style;
    context.stroke();
    context.fill();

    context.beginPath();
    context.arc(centerx, centery, 1.5 * scale, 0, 2 * Math.PI, false);
    context.fillStyle = style;
    context.fill();
  }

  drawhull(stick.hull, context, centerx, centery);

  context.beginPath();
  context.arc(headx, heady, HEAD_RADIUS, 0, 2 * Math.PI, false);
  context.fillStyle = style;
  context.fill();
  if (stick.clickcomplete) {
    context.strokeStyle = COMPLETE_STYLE;
    context.lineWidth = scale;
    context.stroke();
  }

  //drawhull(stick.idlehull, context, centerx, centery);
}

function drawcirclebutton(button, context, centerx, centery, radius, pressedstyle) {
  var style = OUTLINE_STYLE;
  if (button.touched) style = TOUCHED_STYLE;
  if (button.pressed) style = pressedstyle;

  context.beginPath();
  context.arc(centerx, centery, radius, 0, 2 * Math.PI, false);
  context.fillStyle = OUTLINE_STYLE;
  context.fill();
  
  if (!button.digital && button.value > 0.0) {
    context.beginPath();
    context.arc(centerx, centery, radius, 0, 2 * Math.PI, false);
    context.strokeStyle = style;
    context.lineWidth = scale;
    context.stroke();
  }
  
  context.beginPath();
  context.arc(centerx, centery, button.value * radius, 0, 2 * Math.PI, false);
  context.fillStyle = style;
  context.fill();
  
  context.beginPath();
  context.arc(centerx, centery, radius, 0, 2 * Math.PI, false);
  if (button.complete) {
    context.strokeStyle = COMPLETE_STYLE;
    context.lineWidth = scale;
    context.stroke();
  }
}

function drawrectbutton(button, context, x0, y0, width, height, pressedstyle, completeoutline) {
  var style = TOUCHED_STYLE;
  if (button.touched) style = TOUCHED_STYLE;
  if (button.pressed) style = pressedstyle;
  
  context.beginPath();
  context.rect(x0, y0, width, height);
  context.fillStyle = OUTLINE_STYLE;
  context.fill();
  
  if (button.digital && button.pressed) {
    context.beginPath();
    context.rect(x0, y0, width, height);
    context.fillStyle = style;
    context.fill();
  } else if (!button.digital && button.value > 0.0) {
    var padcenterx = x0 + width / 2.0;
    var padcentery = y0 + height / 2.0;

    context.beginPath();
    context.rect(x0, y0, width, height);
    context.strokeStyle = style;
    context.lineWidth = scale;
    context.stroke();
    
    context.beginPath();
    context.rect(padcenterx - button.value * width / 2.0,
                 padcentery - button.value * height / 2.0,
                 button.value * width, button.value * height);
    context.fillStyle = style;
    context.fill();
  }
  
  if (completeoutline && button.complete) {
    context.beginPath();
    context.rect(x0, y0, width, height);
    context.strokeStyle = COMPLETE_STYLE;
    context.lineWidth = scale;
    context.stroke();
  }
}

function drawsquarebutton(button, context, x0, y0, size, pressedstyle, completeoutline) {
  drawrectbutton(button, context, x0, y0, size, size, pressedstyle, completeoutline);
}

function drawactionbuttons(primary, secondary, tertiary, quaternary, context, centerx, centery) {
  var x0 = centerx - ACTION_BUTTON_GROUP_SIZE / 2.0 + BUTTON_RADIUS;
  var x1 = centerx;
  var x2 = centerx + ACTION_BUTTON_GROUP_SIZE / 2.0 - BUTTON_RADIUS;
  var y0 = centery - ACTION_BUTTON_GROUP_SIZE / 2.0 + BUTTON_RADIUS;
  var y1 = centery;
  var y2 = centery + ACTION_BUTTON_GROUP_SIZE / 2.0 - BUTTON_RADIUS;

  drawcirclebutton(primary, context, x1, y2, BUTTON_RADIUS, PRIMARY_STYLE);
  drawcirclebutton(secondary, context, x2, y1, BUTTON_RADIUS, SECONDARY_STYLE);
  drawcirclebutton(tertiary, context, x0, y1, BUTTON_RADIUS, TERTIARY_STYLE);
  drawcirclebutton(quaternary, context, x1, y0, BUTTON_RADIUS, QUATERNARY_STYLE);
}

function drawdpad(up, down, left, right, context, centerx, centery, showmapping) {
  var x0 = centerx - DPAD_SIZE / 2.0;
  var y0 = centery - DPAD_SIZE / 2.0;
  var x1 = centerx - DPAD_PAD_WIDTH / 2.0;
  var y1 = centery - DPAD_PAD_WIDTH / 2.0;
  var x2 = centerx + DPAD_SIZE / 2.0 - DPAD_PAD_WIDTH;
  var y2 = centery + DPAD_SIZE / 2.0 - DPAD_PAD_WIDTH;
  
  if (up.complete) {
    context.beginPath();
    context.rect(x1, y0, DPAD_PAD_WIDTH, DPAD_SIZE / 2.0);
    context.strokeStyle = COMPLETE_STYLE;
    context.lineWidth = 2 * scale;
    context.stroke();
  }
  if (down.complete) {
    context.beginPath();
    context.rect(x1, y0 + DPAD_SIZE / 2.0, DPAD_PAD_WIDTH, DPAD_SIZE / 2.0);
    context.strokeStyle = COMPLETE_STYLE;
    context.lineWidth = 2 * scale;
    context.stroke();
  }
  if (left.complete) {
    context.beginPath();
    context.rect(x0, y1, DPAD_SIZE / 2.0, DPAD_PAD_WIDTH);
    context.strokeStyle = COMPLETE_STYLE;
    context.lineWidth = 2 * scale;
    context.stroke();
  }
  if (right.complete) {
    context.beginPath();
    context.rect(x0 + DPAD_SIZE / 2.0, y1, DPAD_SIZE / 2.0, DPAD_PAD_WIDTH);
    context.strokeStyle = COMPLETE_STYLE;
    context.lineWidth = 2 * scale;
    context.stroke();
  }
  if (showmapping) {
    
  }


  context.beginPath();
  context.rect(x1, y0, DPAD_PAD_WIDTH, DPAD_SIZE);
  context.rect(x0, y1, DPAD_SIZE, DPAD_PAD_WIDTH);
  context.fillStyle = OUTLINE_STYLE;
  context.fill();
  
  drawsquarebutton(up, context, x1, y0, DPAD_PAD_WIDTH, PRESSED_STYLE, false);
  drawsquarebutton(down, context, x1, y2, DPAD_PAD_WIDTH, PRESSED_STYLE, false);
  drawsquarebutton(left, context, x0, y1, DPAD_PAD_WIDTH, PRESSED_STYLE, false);
  drawsquarebutton(right, context, x2, y1, DPAD_PAD_WIDTH, PRESSED_STYLE, false);
}

function drawbuttoncell(button, context, x, y, width, height, selected) {
  context.beginPath();
  context.rect(x, y, width, height);
  context.fillStyle = selected ? FOREGROUND_STYLE : OUTLINE_STYLE;
  context.fill();

  if (button.value > 0.0) {
    var xmid = x + width / 2.0;
    var ymid = y + height / 2.0;

    context.beginPath();
    context.rect(xmid - button.value * width / 2.0,
                 ymid - button.value * height / 2.0,
                 button.value * width,
                 button.value * height);
    context.fillStyle = button.pressed ? POSITIVE_STYLE : FOREGROUND_STYLE;
    context.fill();
  }
}

function drawaxiscell(axis, context, x, y, width, height, selected) {
  context.beginPath();
  context.rect(x, y, width, height);
  context.fillStyle = selected ? FOREGROUND_STYLE : OUTLINE_STYLE;
  context.fill();

  var xmid = x + width / 2.0;
  var ymid = y + height / 2.0;
  var axisstyle = (axis > 0.0) ? POSITIVE_STYLE : NEGATIVE_STYLE;
  var absaxis = Math.abs(axis);

  context.beginPath();
  context.rect(xmid - absaxis * width / 2.0,
               ymid - absaxis * height / 2.0,
               absaxis * width,
               absaxis * height);
  context.fillStyle = (axis > 0.0) ? POSITIVE_STYLE : NEGATIVE_STYLE;
  context.fill();
}

function drawaxisbuttontable(buttons, axes, context, x0, y0) {
  var cellwidth = TABLE_WIDTH / (buttons.length + axes.length);
  var cellheight = TABLE_HEIGHT;
  for (var i = 0; i < buttons.length + axes.length; ++i) {
    var x = x0 + i * cellwidth;
    var y = y0;
    var selected = (i == dragitembuttonaxisindex);

    if (i < buttons.length)
      drawbuttoncell(buttons[i], context, x, y, cellwidth, cellheight, selected);
    else if (i < buttons.length + axes.length)
      drawaxiscell(axes[i - buttons.length], context, x, y, cellwidth, cellheight, selected);
    
    if (lastmousex >= x && lastmousex < x + cellwidth && lastmousey >= y && lastmousey < y + cellwidth) {
      context.beginPath();
      context.moveTo(x, y + cellheight);
      context.lineTo(x + cellwidth, y + cellheight);
      context.strokeStyle = PRIMARY_STYLE;
      context.lineWidth = scale;
      context.stroke();
    }
  }
}

function testaxisbuttontable(buttons, axes, mousex, mousey, x0, y0) {
  var cellwidth = TABLE_WIDTH / (buttons.length + axes.length);
  var cellheight = TABLE_HEIGHT;
  if (mousex >= x0 && mousex < x0 + TABLE_WIDTH && mosuey >= y0 && mousey < y0 + TABLE_HEIGHT) {
    return 0;
  }
  return -1;
}


function drawgamepad(state, pad, xoffset, yoffset, now) {
  var x0 = XPCT_LEFT_COLUMN * GAMEPAD_WIDTH;
  var x1 = XPCT_CENTER_COLUMN * GAMEPAD_WIDTH;
  var x2 = XPCT_RIGHT_COLUMN * GAMEPAD_WIDTH;

  var y0 = YPCT_TRIGGERS_TOP * GAMEPAD_HEIGHT;
  var y1 = YPCT_SHOULDERS_TOP * GAMEPAD_HEIGHT;
  var y2 = YPCT_STICKS_CENTER * GAMEPAD_HEIGHT;
  var y3 = YPCT_START_SELECT_TOP * GAMEPAD_HEIGHT;
  var y4 = YPCT_DPAD_ACTION_BUTTON_CENTER * GAMEPAD_HEIGHT;
  
  var showmapping = true;

  if (pad) drawaxisbuttontable(pad.buttons, pad.axes, context, xoffset + 10 * scale, yoffset, showmapping);
  drawstick(state.sticks[0], context, xoffset + x0, yoffset + y2, showmapping);
  drawstick(state.sticks[1], context, xoffset + x2, yoffset + y2, showmapping);
  drawactionbuttons(state.buttons[BUTTON_PRIMARY],
                    state.buttons[BUTTON_SECONDARY],
                    state.buttons[BUTTON_TERTIARY],
                    state.buttons[BUTTON_QUATERNARY],
                    context, xoffset + x2, yoffset + y4, showmapping);
  drawrectbutton(state.buttons[BUTTON_LEFT_SHOULDER], context,
                 xoffset + x0 - 0.08 * GAMEPAD_WIDTH, yoffset + y1,
                 SHOULDER_WIDTH, SHOULDER_HEIGHT, QUATERNARY_STYLE, true, showmapping);
  drawrectbutton(state.buttons[BUTTON_RIGHT_SHOULDER], context,
                 xoffset + x2 - 0.06 * GAMEPAD_WIDTH, yoffset + y1,
                 SHOULDER_WIDTH, SHOULDER_HEIGHT, QUATERNARY_STYLE, true, showmapping);
  drawrectbutton(state.buttons[BUTTON_LEFT_TRIGGER], context,
                 xoffset + x0 - 0.04 * GAMEPAD_WIDTH, yoffset + y0,
                 TRIGGER_WIDTH, TRIGGER_HEIGHT, QUATERNARY_STYLE, true, showmapping);
  drawrectbutton(state.buttons[BUTTON_RIGHT_TRIGGER], context,
                 xoffset + x2 - 0.04 * GAMEPAD_WIDTH, yoffset + y0,
                 TRIGGER_WIDTH, TRIGGER_HEIGHT, QUATERNARY_STYLE, true, showmapping);
  drawrectbutton(state.buttons[BUTTON_BACK_SELECT], context,
                 xoffset + x1 - 0.125 * GAMEPAD_WIDTH, yoffset + y3,
                 SELECT_START_WIDTH, SELECT_START_HEIGHT, PRIMARY_STYLE, true, showmapping);
  drawrectbutton(state.buttons[BUTTON_START], context,
                 xoffset + x1 + 0.025 * GAMEPAD_WIDTH, yoffset + y3,
                 SELECT_START_WIDTH, SELECT_START_HEIGHT, PRIMARY_STYLE, true, showmapping);
  drawcirclebutton(state.buttons[BUTTON_META], context,
                  xoffset + x1, yoffset + y2 + BUTTON_RADIUS / 2, BUTTON_RADIUS, TERTIARY_STYLE);
  drawdpad(state.buttons[BUTTON_DPAD_UP],
           state.buttons[BUTTON_DPAD_DOWN],
           state.buttons[BUTTON_DPAD_LEFT],
           state.buttons[BUTTON_DPAD_RIGHT],
           context, xoffset + x0, yoffset + y4, showmapping);
}


function updatestickstate(state, lx, ly, rx, ry, now) {
  var lstick = state.sticks[0];
  var rstick = state.sticks[1];
  if (lstick.x != lx || lstick.y != ly) lstick.lastchanged = now;
  if (rstick.x != rx || rstick.y != ry) rstick.lastchanged = now;
  lstick.x = lx;
  lstick.y = ly;
  rstick.x = rx;
  rstick.y = ry;
}

function updatebuttonstate(state, index, button, now) {
  if (button != state.buttons[index].value) {
    state.buttons[index].lastchanged = now;
    if (index == BUTTON_LEFT_TRIGGER || index == BUTTON_RIGHT_TRIGGER)
      state.triggers[index - BUTTON_LEFT_TRIGGER].lastchanged = now;
  }

  state.buttons[index].value = button;
  state.buttons[index].pressed = button > 0;
  state.buttons[index].touched = button > 0;
  if (index == BUTTON_LEFT_TRIGGER || index == BUTTON_RIGHT_TRIGGER) {
    var triggerindex = index - BUTTON_LEFT_TRIGGER;
    state.triggers[triggerindex].value = button;
    state.triggers[triggerindex].pressed = button > 0;
    state.triggers[triggerindex].touched = button > 0;
  } else if (index == BUTTON_LEFT_THUMBSTICK || index == BUTTON_RIGHT_THUMBSTICK) {
    var stickindex = index - BUTTON_LEFT_THUMBSTICK;
    state.sticks[stickindex].click = button > 0;
  }
}

function updatestate(state, pad, now) {
  updatestickstate(state, pad.axes[AXIS_LSTICK_X], pad.axes[AXIS_LSTICK_Y], pad.axes[AXIS_RSTICK_X], pad.axes[AXIS_RSTICK_Y], now);
  updatebuttonstate(state, BUTTON_PRIMARY, pad.buttons[BUTTON_PRIMARY], now);
  updatebuttonstate(state, BUTTON_SECONDARY, pad.buttons[BUTTON_SECONDARY], now);
  updatebuttonstate(state, BUTTON_TERTIARY, pad.buttons[BUTTON_TERTIARY], now);
  updatebuttonstate(state, BUTTON_QUATERNARY, pad.buttons[BUTTON_QUATERNARY], now);
  updatebuttonstate(state, BUTTON_LEFT_SHOULDER, pad.buttons[BUTTON_LEFT_SHOULDER], now);
  updatebuttonstate(state, BUTTON_RIGHT_SHOULDER, pad.buttons[BUTTON_RIGHT_SHOULDER], now);
  updatebuttonstate(state, BUTTON_LEFT_TRIGGER, pad.buttons[BUTTON_LEFT_TRIGGER], now);
  updatebuttonstate(state, BUTTON_RIGHT_TRIGGER, pad.buttons[BUTTON_RIGHT_TRIGGER], now);
  updatebuttonstate(state, BUTTON_BACK_SELECT, pad.buttons[BUTTON_BACK_SELECT], now);
  updatebuttonstate(state, BUTTON_START, pad.buttons[BUTTON_START], now);
  updatebuttonstate(state, BUTTON_LEFT_THUMBSTICK, pad.buttons[BUTTON_LEFT_THUMBSTICK], now);
  updatebuttonstate(state, BUTTON_RIGHT_THUMBSTICK, pad.buttons[BUTTON_RIGHT_THUMBSTICK], now);
  updatebuttonstate(state, BUTTON_DPAD_UP, pad.buttons[BUTTON_DPAD_UP], now);
  updatebuttonstate(state, BUTTON_DPAD_DOWN, pad.buttons[BUTTON_DPAD_DOWN], now);
  updatebuttonstate(state, BUTTON_DPAD_LEFT, pad.buttons[BUTTON_DPAD_LEFT], now);
  updatebuttonstate(state, BUTTON_DPAD_RIGHT, pad.buttons[BUTTON_DPAD_RIGHT], now);
  updatebuttonstate(state, BUTTON_META, pad.buttons[BUTTON_META], now);

  var stickscomplete = true;
  var sticksprogress = 0;
  for (i = 0; i < state.sticks.length; ++i) {
    var stick = state.sticks[i];
    var r = Math.sqrt(stick.x * stick.x + stick.y * stick.y);
    var theta = Math.atan2(stick.y, stick.x);

    if (theta < 0) theta += 2 * Math.PI;

    stick.magnitude = r;
    stick.angle = theta;
    stick.degrees = theta * RADIANS_TO_DEGREES;
    stick.zero = stick.magnitude < DEADZONE_RADIUS;
    if (stick.zero) stick.lastzero = now;
    else stick.lastnonzero = now;
    if (!stick.centered && now - stick.lastnonzero > CENTERING_TIMEOUT_MILLIS)
      stick.centered = (stick.x === 0.0 && stick.y === 0.0);
    
    stick.hull = addpointtohull(stick.hull, stick.x, stick.y);
    
    if (stick.magnitude < 0.25 && now - stick.lastchanged > CENTERING_TIMEOUT_MILLIS)
      stick.idlehull = addpointtohull(stick.idlehull, stick.x, stick.y);

    var hullcomplete = true;
    var hullprogress = 0;
    var totalprogress = 0;
    var p1 = stick.hull[stick.hull.length - 1];
    for (var j = 0; j < stick.hull.length; ++j) {
      var p2 = stick.hull[j];
      var d12 = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
      totalprogress += d12;
      if (d12 === 0.0) {
        if (Math.sqrt(p1.x * p1.x + p1.y * p1.y) < 0.999)
          hullcomplete = false;
      } else {
        var rmax = Math.abs((p2.x - p1.x) * (p1.y - 0.0) - (p1.x - 0.0) * (p2.y - p1.y)) / d12;
        if (rmax >= 0.999)
          hullprogress += d12;
        else 
          hullcomplete = false;
      }
      p1 = p2;
    }
    stick.hullprogress = hullprogress / totalprogress;
    stick.hullcomplete = hullcomplete;
    
    if (!stick.complete) {
      if (stick.click) stick.clickcomplete = true;
      if (stick.clickcomplete && stick.hullcomplete) {
        stick.complete = true;
        ++sticksprogress;
      } else {
        stickscomplete = false;
      }
    }
  }

  var triggerscomplete = true;
  var triggersprogress = 0;
  for (i = 0; i < state.triggers.length; ++i) {
    var trigger = state.triggers[i];
    
    if (trigger.value < trigger.minseenvalue) {
      trigger.minseenvalue = trigger.value;
      if (trigger.value < trigger.zerovalue) trigger.zerovalue = trigger.value;
    }
    if (trigger.value > trigger.maxseenvalue) {
      trigger.maxseenvalue = trigger.value;
      if (trigger.value > trigger.maxvalue) trigger.maxvalue = trigger.value;
    }

    trigger.zero = trigger.value === trigger.zerovalue;
    trigger.max = trigger.value === trigger.maxvalue;

    if (trigger.zero) trigger.lastzero = now;
    else trigger.lastnonzero = now;
    if (trigger.max) trigger.lastmax = now;

    if (!trigger.complete) {
      if (trigger.minseenvalue == trigger.zerovalue && trigger.maxseenvalue == trigger.maxvalue && trigger.zerovalue != trigger.maxvalue) {
        trigger.complete = true;
        ++triggersprogress;
      } else {
        triggerscomplete = false;
      }
    }
  }

  if (pad.vibrationActuator) {
    var lefttriggervalue = state.triggers[0].value;
    var righttriggervalue = state.triggers[1].value;
    var leftshouldervalue = state.buttons[BUTTON_LEFT_SHOULDER].value;
    var rightshouldervalue = state.buttons[BUTTON_RIGHT_SHOULDER].value;
    pad.vibrationActuator.playEffect("dual-rumble", {
      duration: 1000,
      strongMagnitude: lefttriggervalue,
      weakMagnitude: righttriggervalue
    });
    //console.log("left: " + lefttriggervalue + " right: " + righttriggervalue);
  }
  
  var buttonscomplete = true;
  var buttonsprogress = 0;
  for (i = 0; i < state.buttons.length; ++i) {
    var button = state.buttons[i];
    
    if (button.digital && button.value !== 0.0 && button.value !== 1.0)
      button.digital = false;
    
    if (button.value < button.minseenvalue) {
      button.minseenvalue = button.value;
      if (button.value < button.zerovalue) button.zerovalue = button.value;
    }
    if (button.value > button.maxseenvalue) {
      button.maxseenvalue = button.value;
      if (button.value > button.maxvalue) button.maxvalue = button.value;
    }

    if (!button.complete) {
      if (button.minseenvalue == button.zerovalue && button.maxseenvalue == button.maxvalue && button.zerovalue != button.maxvalue) {
        button.complete = true;
        ++buttonsprogress;
      } else {
        buttonscomplete = false;
      }
    }
  }

  var progress = 0;
  for (i = 0; i < state.sticks.length; ++i) {
    if (state.sticks[i].complete) ++progress;
  }
  for (i = 0; i < state.triggers.length; ++i) {
    if (state.triggers[i].complete) ++progress;
  }
  for (i = 0; i < state.buttons.length; ++i) {
    var button = state.buttons[i];
    if (button.analogcomplete || button.digital && button.digitalcomplete) ++progress;
  }
  state.progress = progress;
}

function animate(canvas, context) {
  var gamepads = navigator.getGamepads();
  var now = new Date();

  for (i = 0; i < PAD_COUNT; ++i) {
    var pad = gamepads[i];
    var state = padstate[i];
    
    state.isvalid = (pad != null && pad.connected);
  
    if (pad != null) {
      if (pad.timestamp > state.timestamp) {
        state.timestamp = pad.timestamp;
        state.lastseen = now;
      }
      
      state.ismapped = (pad.mapping == "standard");
      state.axiscount = pad.axes.length;
      state.buttoncount = pad.buttons.length;
      state.age = now - state.lastseen;

      //updatestate(state, pad, now);
    }
  }

  drawrectangle(context, 0, 0, 2 * GAMEPAD_WIDTH, 2 * GAMEPAD_HEIGHT, BACKGROUND_STYLE)

  for (var i = 0; i < padstate.length; ++i) {
    var xoffset = Math.floor(i / 2) * GAMEPAD_WIDTH;
    var yoffset = (i % 2) * GAMEPAD_HEIGHT;
    drawgamepad(padstate[i], gamepads[i], xoffset, yoffset);
  }
  
  frame = frame + 1;

  // request new frame
  requestAnimFrame(function() {
    animate(canvas, context);
  });
}

function mousedown(mousex, mousey) {
  isdragging = true;
  hastooltip = true;
  lastmousex = mousex;
  lastmousey = mousey;
  for (var i = 0; i < padstate.length; ++i) {
    var xoffset = Math.floor(i / 2) * GAMEPAD_WIDTH;
    var yoffset = (i % 2) * GAMEPAD_HEIGHT;
    testaxisbuttontable(mousex, mousey, xoffset + 10 * scale, yoffset);
  }
}

function mouseup(mousex, mousey) {
  isdragging = false;
  lastmousex = mousex;
  lastmousey = mousey;
}

function mousemove(mousex, mousey) {
  lastmousex = mousex;
  lastmousey = mousey;
  if (isdragging) {
    dragx = mousex - TABLE_HEIGHT / 2;
    dragy = mousey - TABLE_HEIGHT / 2;
  }
}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
    y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
  };
}

function onInputReport(event) {
  let state = padstate[0];
  let reportId = event.reportId;
  let reportData = event.data;
  
  if (reportId == 0x01) {
    console.log('got here');
    state.isvalid = true;
  
    let now = new Date();
    let leftStickX = (2 * reportData.getUint8(0) / 0xFF) - 1.0;
    let leftStickY = (2 * reportData.getUint8(1) / 0xFF) - 1.0;
    let rightStickX = (2 * reportData.getUint8(2) / 0xFF) - 1.0;
    let rightStickY = (2 * reportData.getUint8(3) / 0xFF) - 1.0;
    let dpad = reportData.getUint8(4) & 0x0f;
    let dpadUp = (dpad == 0 || dpad == 1 || dpad == 7);  // N, NE, NW
    let dpadDown = (dpad == 3 || dpad == 4 || dpad == 5);  // SE, S, SW
    let dpadLeft = (dpad == 5 || dpad == 6 || dpad == 7);  // SW, W, NW
    let dpadRight = (dpad == 1 || dpad == 2 || dpad == 3);  // NE, E, SE
    let buttonSquare = !!(reportData.getUint8(4) & 0x10);
    let buttonCross = !!(reportData.getUint8(4) & 0x20);
    let buttonCircle = !!(reportData.getUint8(4) & 0x40);
    let buttonTriangle = !!(reportData.getUint8(4) & 0x80);
    
    let buttonL1 = !!(reportData.getUint8(5) & 0x01);
    let buttonR1 = !!(reportData.getUint8(5) & 0x02);
    let buttonL2 = !!(reportData.getUint8(5) & 0x04);
    let buttonR2 = !!(reportData.getUint8(5) & 0x08);
    let buttonShare = !!(reportData.getUint8(5) & 0x10);
    let buttonOptions = !!(reportData.getUint8(5) & 0x20);
    let buttonL3 = !!(reportData.getUint8(5) & 0x40);
    let buttonR3 = !!(reportData.getUint8(5) & 0x80);

    let buttonPS = !!(reportData.getUint8(6) & 0x01);
    let buttonTouchpad = !!(reportData.getUint8(6) & 0x02);
    let axisL2 = reportData.getUint8(7) / 0xFF;
    let axisR2 = reportData.getUint8(8) / 0xFF;
    
    updatestickstate(state, leftStickX, leftStickY, rightStickX, rightStickY, now);
    updatebuttonstate(state, BUTTON_PRIMARY, buttonCross, now);
    updatebuttonstate(state, BUTTON_SECONDARY, buttonCircle, now);
    updatebuttonstate(state, BUTTON_TERTIARY, buttonSquare, now);
    updatebuttonstate(state, BUTTON_QUATERNARY, buttonTriangle, now);
    updatebuttonstate(state, BUTTON_LEFT_SHOULDER, buttonL1, now);
    updatebuttonstate(state, BUTTON_RIGHT_SHOULDER, buttonR1, now);
    updatebuttonstate(state, BUTTON_LEFT_TRIGGER, axisL2, now);
    updatebuttonstate(state, BUTTON_RIGHT_TRIGGER, axisR2, now);
    updatebuttonstate(state, BUTTON_BACK_SELECT, buttonShare, now);
    updatebuttonstate(state, BUTTON_START, buttonOptions, now);
    updatebuttonstate(state, BUTTON_LEFT_THUMBSTICK, buttonL3, now);
    updatebuttonstate(state, BUTTON_RIGHT_THUMBSTICK, buttonR3, now);
    updatebuttonstate(state, BUTTON_DPAD_UP, dpadUp, now);
    updatebuttonstate(state, BUTTON_DPAD_DOWN, dpadDown, now);
    updatebuttonstate(state, BUTTON_DPAD_LEFT, dpadLeft, now);
    updatebuttonstate(state, BUTTON_DPAD_RIGHT, dpadRight, now);
    updatebuttonstate(state, BUTTON_META, buttonPS, now);
  }
}

var device = null;
async function requestDevice() {
  device = await navigator.hid.requestDevice({filters:[
      { vendorId: 0x054c, productId: 0x05c4 },  // Dualshock4 V1
      { vendorId: 0x054c, productId: 0x09cc },  // Dualshock4 V2
  ]});
  
  if (!device) {
    console.log('chooser dismissed with no selection');
    return;
  }
  
  await device.open();
  if (!device.opened) {
    console.log('open failed');
    return;
  }
  
  device.oninputreport = onInputReport;
  
  console.log('Connected to device: ' + device.productName);
}

// Copyright 2001, softSurfer (www.softsurfer.com)
// This code may be freely used and modified for any purpose
// providing that this copyright notice is included with it.
// SoftSurfer makes no warranty for this code, and cannot be held
// liable for any real or imagined damage resulting from its use.
// Users of this code must verify correctness for their application.
// http://softsurfer.com/Archive/algorithm_0203/algorithm_0203.htm
// Assume that a class is already given for the object:
//    Point with coordinates {float x, y;}
//===================================================================

// isLeft(): tests if a point is Left|On|Right of an infinite line.
//    Input:  three points P0, P1, and P2
//    Return: >0 for P2 left of the line through P0 and P1
//            =0 for P2 on the line
//            <0 for P2 right of the line

function sortPointX(a, b) {
    return a.x - b.x;
}
function sortPointY(a, b) {
    return a.y - b.y;
}

function isLeft(P0, P1, P2) {    
    return (P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y);
}
//===================================================================

// chainHull_2D(): A.M. Andrew's monotone chain 2D convex hull algorithm
// http://softsurfer.com/Archive/algorithm_0109/algorithm_0109.htm
// 
//     Input:  P[] = an array of 2D points 
//                   presorted by increasing x- and y-coordinates
//             n = the number of points in P[]
//     Output: H[] = an array of the convex hull vertices (max is n)
//     Return: the number of points in H[]


function chainHull_2D(P, n, H) {
    // the output array H[] will be used as the stack
    var bot = 0,
    top = (-1); // indices for bottom and top of the stack
    var i; // array scan index
    // Get the indices of points with min x-coord and min|max y-coord
    var minmin = 0,
        minmax;
        
    var xmin = P[0].x;
    for (i = 1; i < n; i++) {
        if (P[i].x != xmin) {
            break;
        }
    }
    
    minmax = i - 1;
    if (minmax == n - 1) { // degenerate case: all x-coords == xmin 
        H[++top] = P[minmin];
        if (P[minmax].y != P[minmin].y) // a nontrivial segment
            H[++top] = P[minmax];
        H[++top] = P[minmin]; // add polygon endpoint
        return top + 1;
    }

    // Get the indices of points with max x-coord and min|max y-coord
    var maxmin, maxmax = n - 1;
    var xmax = P[n - 1].x;
    for (i = n - 2; i >= 0; i--) {
        if (P[i].x != xmax) {
            break; 
        }
    }
    maxmin = i + 1;

    // Compute the lower hull on the stack H
    H[++top] = P[minmin]; // push minmin point onto stack
    i = minmax;
    while (++i <= maxmin) {
        // the lower line joins P[minmin] with P[maxmin]
        if (isLeft(P[minmin], P[maxmin], P[i]) >= 0 && i < maxmin) {
            continue; // ignore P[i] above or on the lower line
        }
        
        while (top > 0) { // there are at least 2 points on the stack
            // test if P[i] is left of the line at the stack top
            if (isLeft(H[top - 1], H[top], P[i]) > 0) {
                break; // P[i] is a new hull vertex
            }
            else {
                top--; // pop top point off stack
            }
        }
        
        H[++top] = P[i]; // push P[i] onto stack
    }

    // Next, compute the upper hull on the stack H above the bottom hull
    if (maxmax != maxmin) { // if distinct xmax points
        H[++top] = P[maxmax]; // push maxmax point onto stack
    }
    
    bot = top; // the bottom point of the upper hull stack
    i = maxmin;
    while (--i >= minmax) {
        // the upper line joins P[maxmax] with P[minmax]
        if (isLeft(P[maxmax], P[minmax], P[i]) >= 0 && i > minmax) {
            continue; // ignore P[i] below or on the upper line
        }
        
        while (top > bot) { // at least 2 points on the upper stack
            // test if P[i] is left of the line at the stack top
            if (isLeft(H[top - 1], H[top], P[i]) > 0) { 
                break;  // P[i] is a new hull vertex
            }
            else {
                top--; // pop top point off stack
            }
        }
        
        if (P[i].x == H[0].x && P[i].y == H[0].y) {
            return top + 1; // special case (mgomes)
        }
        
        H[++top] = P[i]; // push P[i] onto stack
    }
    
    if (minmax != minmin) {
        H[++top] = P[minmin]; // push joining endpoint onto stack
    }
    
    return top + 1;
}


//==================================================================


var padstate = initpadstate();
var canvas = document.getElementById('myCanvas');
var context = canvas.getContext('2d');

window.requestAnimFrame = (function(callback) {
  return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
  function(callback) {
    window.setTimeout(callback, 1000 / 60);
  };
})();

canvas.addEventListener('mousemove', function(evt) {
  var mousePos = getMousePos(canvas, evt);
  mousemove(mousePos.x, mousePos.y);
}, false);

canvas.addEventListener('mousedown', function(evt) {
  var mousePos = getMousePos(canvas, evt);
  mousedown(mousePos.x, mousePos.y);
}, false);

canvas.addEventListener('mouseup', function(evt) {
  var mousePos = getMousePos(canvas, evt);
  mouseup(mousePos.x, mousePos.y);
}, false);

setTimeout(function() {
  var startTime = (new Date()).getTime();
  animate(canvas, context);
}, 0);
