;(function (exports, $, _) {
    "use strict";

    var KEY_BACKSPACE = 8;
    var KEY_DELETE    = 46;

    var transferStyles = function($from, $to, properties) {
        var i, n, styles = {};
        if (properties) {
            for (i = 0, n = properties.length; i < n; i += 1) {
                styles[properties[i]] = $from.css(properties[i]);
            }
        } else {
            styles = $from.css();
        }
        $to.css(styles);
    };

    var measureString = function(str, $parent) {
        if (!str) {
            return 0;
        }

        var $test = $('<test>').css({
            position: 'absolute',
            top: -99999,
            left: -99999,
            width: 'auto',
            padding: 0,
            whiteSpace: 'pre'
        }).text(str).appendTo('body');

        transferStyles($parent, $test, [
            'letterSpacing',
            'fontSize',
            'fontFamily',
            'fontWeight',
            'textTransform'
        ]);

        var width = $test.width();
        $test.remove();

        return width;
    };

    var autoGrow = function($input) {
        var currentWidth = null;

        var update = function(e) {
            var value, keyCode, printable, placeholder, width;
            var shift, character, selection;
            e = e || exports.event || {};

            if (e.metaKey || e.altKey) {
                return;
            }

            value = $input.val();
            if (e.type && e.type.toLowerCase() === 'keydown') {
                keyCode = e.keyCode;
                printable = (
                    (keyCode >= 97 && keyCode <= 122) || // a-z
                    (keyCode >= 65 && keyCode <= 90)  || // A-Z
                    (keyCode >= 48 && keyCode <= 57)  || // 0-9
                    keyCode === 32 // space
                );

                if (keyCode === KEY_DELETE || keyCode === KEY_BACKSPACE) {
                    selection = exports.getSelection($input[0]);
                    if (selection.length) {
                        value = value.substring(0, selection.start) + value.substring(selection.start + selection.length);
                    } else if (keyCode === KEY_BACKSPACE && selection.start) {
                        value = value.substring(0, selection.start - 1) + value.substring(selection.start + 1);
                    } else if (keyCode === KEY_DELETE && selection.start !== 'undefined') {
                        value = value.substring(0, selection.start) + value.substring(selection.start + 1);
                    }
                } else if (printable) {
                    shift = e.shiftKey;
                    character = String.fromCharCode(e.keyCode);
                    if (shift) {
                        character = character.toUpperCase();
                    }
                    else {
                        character = character.toLowerCase();
                    }
                    value += character;
                }
            }

            placeholder = $input.attr('placeholder');
            if (!value && placeholder) {
                value = placeholder;
            }

            width = measureString(value, $input) + 4;
            if (width !== currentWidth) {
                currentWidth = width;
                $input.width(width);
                $input.triggerHandler('resize');
            }
        };

        $input.on('keydown keyup update blur', update);
        update();
    };

    var pluginName = 'search',
        defaults = {
            valueField: 'value',
            labelField: 'label',
            items: [],
            callback: {
                change: function () {
                    return this;
                }
            }
        };
    
    function Search(element, options) {
        this.el = element;
        this.options = $.extend({}, defaults, options);
        this.currentValues = [];
        this.savedItems = [];

        //this._defaults = defaults;
        //this._name = pluginName;

        this.init();
    }
    Search.prototype.init = function () {
        // массив с которым будем работать
        this.currentItems = this.options.items;
        this.$el = $(this.el).wrap('<div class="search-wrap" />');

        this.$dropdown = $('<div />')
            .addClass('form-control dropdown')
            .insertAfter(this.$el)
            .hide();

        this.$input = $('<input type="text" />')
            .css({
                border: '0 none',
                background: 'none',
                padding: 0,
                lineHeight: 'inherit',
                width: 4
            })
            .appendTo(this.$el)
            .on({
                keyup: $.proxy(this.keyup, this)
            });
        autoGrow(this.$input);

        this.$el.on('click', $.proxy(this.focus, this));
        // скрываем дропдаун, если кликнули вне его области
        $(exports).on('mouseup', $.proxy(this.hideDropdown, this));
    };
    Search.prototype.hideDropdown = function (e) {
        if($(e.target).closest('.search-wrap').length === 0) {
            this.$dropdown.hide();
        }
    };
    Search.prototype.keyup = function (e) {
        var searchText = this.$input.val(),
            escapedSearchText = searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"),
            regex = new RegExp(escapedSearchText, 'i');

        if (!escapedSearchText.length && this.savedItems.length && e.keyCode === KEY_BACKSPACE) {
            //var obj = {}, item,
            //    val = this.currentValues.pop();

            this.options.items = this.savedItems.pop();
            this.currentItems = this.options.items;

            //obj[this.options.valueField] = val;
            //item = _.findWhere(this.options.items, obj);

            this.$input.prev('span').remove();
            //this.$input.val(item.label);
        } else {
            // обновлям текщий массив
            this.currentItems = [];
            this.options.items.forEach(function (item) {
                var label = item[this.options.labelField];
                if (regex.test(label)) {
                    this.currentItems.push(item);
                }
            }, this);
        }
        this.focus();
    };
    Search.prototype.focus = function () {
        this.$input.focus();
        this.$dropdown.empty();

        this.currentItems.forEach(function (item) {
            var label = item[this.options.labelField];

            $('<span />')
                .addClass('btn btn-default btn-xs btn-label')
                .text(label)
                .click($.proxy(this.labelClick, this, item[this.options.valueField]))
                .appendTo(this.$dropdown);
        }, this);

        if (this.currentItems.length) {
            this.$dropdown.show();
        }
    };
    Search.prototype.labelClick = function (value) {
        var obj = {}, item;
        this.currentValues.push(value);
        this.savedItems.push(this.options.items);

        this.$input.val('');
        this.$dropdown.empty().hide();

        obj[this.options.valueField] = value;
        item = _.findWhere(this.options.items, obj);

        $('<span />')
            .addClass('btn btn-default btn-xs btn-selected')
            .text(item[this.options.labelField])
            .insertBefore(this.$input);

        this.options.callback.change.call(this, value);
        this.focus();
    };

    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new Search(this, options));
            }
            return this;
        });
    };
}(window, jQuery, _));

(function ($) {
    "use strict";

    function load(data) {
        var parent = _.where(data, {parent_id: "0"});

        /*
        var  str = 'Renault', s = 'ren';
        if ((new RegExp(s, 'i')).test(str)) {
            console.log(str);
        }*/

        $(function () {
            $('#search').search({
                items: parent,
                callback: {
                    change: function (value) {
                        var items = _.where(data, {parent_id: value});
                        if (items.length) {
                            // вот тут можно сделать аякс запрос к REST API
                            // и если пришел какой то результат то подсунуть его плагину
                            this.options.items = items;
                            this.currentItems = this.options.items;
                        } else {
                            this.options.items = [];
                            this.currentItems = [];
                        }
                    }
                }
            });
        });
    }
    $.getJSON('data.json', $.proxy(load, this));


    /*var level2 = [
        {value: 1, label: 'Label 1 Sub 1', parent_id: 1},
        {value: 2, label: 'Label 1 Sub 2', parent_id: 1},
        {value: 3, label: 'Label 1 Sub 3', parent_id: 1},
        {value: 4, label: 'Label 1 Sub 4', parent_id: 1},
        {value: 5, label: 'Label 2 Sub 1', parent_id: 2},
        {value: 6, label: 'Label 2 Sub 2', parent_id: 2},
        {value: 7, label: 'Label 2 Sub 3', parent_id: 2}
    ];
    $(function () {
        $('#search').search({
            items: [
                {value: 1, label: 'Label 1'},
                {value: 2, label: 'Label 2'}
            ],
            callback: {
                change: function (value) {
                    // вот тут можно сделать аякс запрос к REST API
                    // и если пришел какой то результат то подсунуть его плагину
                    this.options.items = _.where();
                }
            }
        });
    });*/
}(jQuery));