
function addListener(a, b, c, d) {
  if (a.addEventListener) {
    a.addEventListener(b, c, d);
    return true;
  } else if (a.attachEvent) {
    var e = a.attachEvent("on" + b, c);
    return e;
  } else {
    alert("Handler could not be attached");
  }
}

function bind(a,b,c,d) {
  return window.addListener(a, b, function() {
			      d.apply(c, arguments);
			    });
}

function handleKeystroke(evt) {
  // Grab the cross browser event
  if (!evt) {
    evt = window.event;
  }
  // Character code of key pressed
  var asc = !evt.keyCode ? (!evt.which ? evt.charCode : evt.which) : evt.keyCode;
  // ASCII character of above code
  var chr = String.fromCharCode(asc).toLowerCase();
  for (var i in this)
  {
    if (asc == i)
    {
      this[i](evt);
      break;
    }
  }
}

function cancelEvent(evt)
{
  evt.cancelBubble = true;
  evt.returnValue = false;
  if (evt.preventDefault)
    evt.preventDefault();
  if (evt.stopPropagation)
    evt.stopPropagation();
  return false;
}
//
// KEY COMMANDS
var keyMap = new Array();
var PAGE_DOWN  = 34;
var PAGE_UP    = 33;
var ARROW_DOWN = 40;
var ARROW_UP   = 38;
var ARROW_RIGHT = 39;
var ARROW_LEFT = 37;

