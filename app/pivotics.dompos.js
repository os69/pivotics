/* global $ */
/* global define */
/* global alert */
/* global window */
/* global document */


define([], function () {

    function getClosestParent(el, tag) {
        tag = tag.toUpperCase();
        do {
            if (el.nodeName === tag) {
                return el;
            }
            el = el.parentNode;
        } while (el);
        return null;
    }

    function getClosestParentByClass(el, cls) {
        do {
            if(!el.classList){
                return null;
            }
            if (el.classList.contains(cls)) {
                return el;
            }
            el = el.parentNode;
        } while (el);
        return null;
    }

    function getFirstChild(el, tag) {
        tag = tag.toUpperCase();
        return el.querySelector(tag);
    }

    var module = {

        getCellPosition: function (element) {
            // get column
            var span;
            var col = 0;
            while (element.previousElementSibling) {
                element = element.previousElementSibling;
                span = element.getAttribute('colspan');
                if (span) col += parseInt(span);
                else col += 1;
            }
            element = element.parentElement;
            // get row
            var row = 0;
            while (element.previousElementSibling) {
                element = element.previousElementSibling;
                span = element.getAttribute('rowspan');
                if (span) row += parseInt(span);
                else row += 1;
            }
            // return result
            return {
                col: col,
                row: row
            };
        },

        getCellElement: function (tableElement, position) {
            // position row
            var span;
            var element = tableElement.children[0].children[0];
            var row = 0;
            while (row < position.row) {
                span = element.getAttribute('rowspan');
                if (span) row += parseInt(span);
                else row += 1;
                element = element.nextElementSibling;
            }
            element = element.children[0];
            // position column
            var col = 0;
            while (col < position.col) {
                span = element.getAttribute('colspan');
                if (span) col += parseInt(span);
                else col += 1;
                element = element.nextElementSibling;
            }
            // return result element
            return element;
        },

        getPosition: function (element) {
            if (!element) return null;
            var pos = [];
            while (true) {
                element = getClosestParent(element, 'TD');
                if (!element) break;
                var posElement = module.getCellPosition(element);
                pos.unshift(posElement);
                element = getClosestParentByClass(element, 'tableui');
                if(!element) return null;
            }
            if (pos.length === 0) return null;
            return pos;
        },

        getElement: function (tableElement, position) {
            var cell;
            for (var i = 0; i < position.length; ++i) {
                var posElement = position[i];
                cell = module.getCellElement(tableElement, posElement);
                tableElement = getFirstChild(cell, 'TABLE');
            }
            return cell;
        }


    };

    /*var pos = module.getCellPosition(document.getElementById('c1'));
    var element = module.getCellElement(document.getElementById('t1'), pos);

    pos = module.getPosition(document.getElementById('c2'));
    element = module.getElement(document.getElementById('t1'),pos);*/

    return module;

});