/*
  Oursignal

  TODO: Swipe code. Swipe up to close modal etc. Swipe to go forwards/back in time.
  TODO: Timeline is only half complete so hidden for now. Click pagination in the meantime?
*/
var oursignal = (function ($, oursignal) {
  var $timestep, $timeline;

  // TODO: Hack job. Velocity colour was always faked and not the best indicator of 'hotness'.
  // I have ideas but not the time, for now the number of sources will do.
  // TODO: Colours. The blue draws attention to poor links, this isn't the best UX but the treemap looks shit without
  // a bit of colour.
  function link_colour(link) {
    var count = 0;
    $.each(link['scores'], function(k, v) { if ( v > 0) count += 1; });

    if (link.score > 0.2) {
      if (count == 5) return '#cc3732';
    }
    if (link.score > 0.7) {
      if (count == 4) return '#cc7674';
      if (count == 3) return '#cc7674';
    }
    if (link.score < 0.2) {
      if (count == 2) return '#8fabcc';
      if (count == 1) return '#3278cc';
    }
    return '#1b1b1b';
  }

  /*
    Timestep.

    Most of squarify(), worst() and position() nicked from the d3 library.
    http://mbostock.github.com/d3/
  */
  oursignal.timestep = (function (timestep) {
    var timestep_offset,
        other_controls_height,
        links,
        links_length,
        round   = Math.round,
        ratio   = 0.5 * (1 + Math.sqrt(5)); // Golden ratio.

    function worst(row, u) {
      var s    = row.area,
          r,
          rmax = 0,
          rmin = Infinity,
          i    = -1,
          n    = row.length;

      while (++i < n) {
        if (!(r = row[i].area)) continue;
        if (r < rmin) rmin = r;
        if (r > rmax) rmax = r;
      }
      s *= s;
      u *= u;
      return s
          ? Math.max((u * rmax * ratio) / s, s / (u * rmin * ratio))
          : Infinity;
    }

    function position(row, u, rect, flush) {
      var i = -1,
          n = row.length,
          x = rect.x,
          y = rect.y,
          v = u ? round(row.area / u) : 0,
          o;

      if (u == rect.dx) { // horizontal subdivision
        if (flush || v > rect.dy) v = v ? rect.dy : 0; // over+underflow
        while (++i < n) {
          o = row[i];
          o.x = x;
          o.y = y;
          o.dy = v;
          x += o.dx = v ? round(o.area / v) : 0;
        }
        o.z = true;
        o.dx += rect.x + rect.dx - x; // rounding error
        rect.y += v;
        rect.dy -= v;
      } else { // vertical subdivision
        if (flush || v > rect.dx) v = v ? rect.dx : 0; // over+underflow
        while (++i < n) {
          o = row[i];
          o.x = x;
          o.y = y;
          o.dx = v;
          y += o.dy = v ? round(o.area / v) : 0;
        }
        o.z = false;
        o.dy += rect.y + rect.dy - y; // rounding error
        rect.x += v;
        rect.dx -= v;
      }
    }

    function squarify() {
      var rect     = {x: links.x, y: links.y, dx: links.dx, dy: links.dy},
          row      = [],
          children = links.slice(), // Copy.
          child,
          best     = Infinity,
          score,
          u        = Math.min(rect.dx, rect.dy),
          n;

      row.area = 0;
      while ((n = children.length) > 0) {
        row.push(child = children[n - 1]);
        row.area += child.area;
        if ((score = worst(row, u)) <= best) {
          children.pop();
          best = score;
        }
        else {
          row.area   -= row.pop().area;
          position(row, u, rect, false);
          u          = Math.min(rect.dx, rect.dy);
          row.length = row.area = 0;
          best       = Infinity;
        }
      }
      if (row.length) {
        position(row, u, rect, true);
        row.length = row.area = 0;
      }
    }

    // TODO: Animation. Do it intersection style so existing ID's remain and morph?
    function layout() {
      var link,
          $link,
          $entry,
          spread;

      $timestep.html('');
      // $timestep.children().remove();
      // TODO: There is an off by one issue in the treemap code, I end up with one box outside the viewable area.
      for (var i = links_length; i > 1; i--) {
        link       = links[i - 1];
        spread     = link_colour(link);
        $entry     = $('<span/>', {text: link.title});
        $container = $('<a/>', {href: link.url})
          .css({display: 'block', margin: 2, width: link.dx - 4, height: link.dy - 4})
          .append($entry)
          .click(oursignal.meta.open);
        $link      = $('<li/>', {'data-link_id': link.id, 'data-link_score': link.score})
          .data(link)
          .css({left: link.x, top: link.y, width: link.dx, height: link.dy, 'background-color': link_colour(link)})
          .append($container);
        $timestep.append($link);

        // * You can't textfill till the element is added to the DOM.
        // * Experiment with document fragment to avoid flash of unstyled text.
        // * You need the 'entry' div container inside the li to get a margin to work.
        $entry.textfill();
      }
    }

    function scale() {
      var area;

      if (!timestep_offset)       timestep_offset = $timestep.offset();
      if (!other_controls_height) other_controls_height = 0; // other_controls_height = $timeline.height();

      // Root.
      links.x  = timestep_offset.left;
      links.y  = timestep_offset.top;
      links.dx = Math.min($(window).width(), $(document).width());
      links.dy = Math.min($(window).height(), $(document).height()) - timestep_offset.top - other_controls_height;
      $timestep.width(links.dx).height(links.dy);

      // Children.
      for (var i = 0; i < links_length; i++) {
        area = (links[i].score * (links.dx * links.dy / links.score));
        links[i].area = isNaN(area) || area <= 0 ? 0 : area;
      }
    }

    function treemap(data) {
      links        = data.reverse(); // Is already sorted.
      links_length = data.length;
      links.score  = 0;

      // Log scale.
      var scores = [];
      for (i = 0; i < links_length; i++) { scores.push(links[i].score); }

      var max     = Math.max.apply(Math, scores),
          min     = Math.min.apply(Math, scores),
          log_min = Math.log(min),
          log_div = Math.log(max) - log_min;
      for (i = 0; i < links_length; i++) {
        links[i].score = (Math.log(links[i].score) - log_min) / log_div;
        links.score += links[i].score;
      }

      $(window).resize(function () {
        $timestep.html('');
        scale();
        squarify();
        layout();
      }).resize();
    }

    // Move out of timestep.
    var $pulse_logo;
    function pulse_logo () {
      if (!$pulse_logo) {
        $pulse_logo = $('<div/>', {id: 'pulse_logo'});
        $('body').append($pulse_logo);
      }

      $pulse_logo
        .queue('pulse_fx', function (next) { $(this).animate({opacity: 1}, 1500, 'swing', next); })
        .queue('pulse_fx', function (next) { setTimeout(next, 1500); })
        .queue('pulse_fx', function (next) { $(this).animate({opacity: 0}, 1500, 'swing', setTimeout(pulse_logo, 0)); })
        .dequeue('pulse_fx');
    }

    timestep.update = function (time) {
      // TODO: Hack job loading animation. It always runs, stop it.
      $(function () { if ($('#timestep').is('#timestep')) pulse_logo() });
      //$.getJSON('/timestep.json', {time: time}, function (links) {
      $.getJSON('/js/timestep.json', {time: time}, function (links) {
        $(function () { if ($('#timestep').is('#timestep')) treemap(links) });
      });
    };

    return timestep;
  })(oursignal.timestep || {});

  /*
    Options.
  */
  oursignal.options = (function (options) {
    var $open_meta, $open_blank;
    options.open_meta  = false;
    options.open_blank = true;

    function save () {
      $.cookie('oursignal', {open_meta: options.open_meta, open_blank: options.open_blank}, {expires: 315569520000, path: '/'});
    }

    function load () {
      if ($.cookie('oursignal')) {
        $.each($.cookie('oursignal'), function (key, value) {
          options[key] = value;
        });
      }
    }

    options.init = function () {
      $(function () {
        $open_meta = $('#open_meta').change(function () {
          options.open_meta = $(this).prop('checked');
          save();
        });
        $open_blank = $('#open_blank').change(function () {
          options.open_blank = $(this).prop('checked');
          save();
        });

        load();
        $open_meta.prop('checked', options.open_meta);
        $open_blank.prop('checked', options.open_blank);
      });
    };

    return options;
  })(oursignal.options || {});

  /*
    Meta data modal.

    TODO: Locking.
    TODO: JS template all this shit.
  */
  oursignal.meta = (function (meta) {
    var $meta_background,
        $meta_body,
        $meta_foot,
        $meta_content,
        $meta,
        $body,
        $link;

    function layout(link) {
      $meta_content.html(oursignal.templates.meta(link));
      $meta_content.find('.screenshot img').brokenImage();
      $meta_content.find('.retrieved_at time').each(function (index, time) {
        var $time = $(time), ts = moment($time.attr('datetime'));
        if (!ts) return;
        $time.html('Retrieved ' + ts.fromNow() + ', ' + ts.format('LLL') + '.');
      });
      $meta_content.find('a[rel="external"]').click(function (event) {
        event.preventDefault();
        window.open($(this).attr('href'), (oursignal.options.open_blank ? '_blank' : '_self'));
      });
/*
      $.embed.get(link['url'], function (preview) {
        if (console.warn) console.warn(preview);
        $meta_content.append($('<img/>', {'class': preview['type'], src: preview['url']}));
      });
*/
    }

    meta.init = function () {
      $body            = $('#body');
      $meta            = $('#meta');
      $meta_background = $('#meta > .background');
      $meta_body       = $('#meta > .body');
      $meta_content    = $('#meta .content');
      $meta_foot       = $('#meta .foot');

      $meta_body.swipe({swipeUp: meta.close}).swipe('disable');
      $meta_foot.click(meta.close);
      $(document).keydown(function (event) {
         if (event.keyCode == 27 && $meta.is(':visible')) meta.close();
      });
    };

    meta.open = function (event) {
      if (event.which != 1) return; // If middle click go with default handling.

      if (!$meta) meta.init();

      event.preventDefault();
      $link = $(this).closest('li');
      link  = $link.data();

      if (!oursignal.options.open_meta) {
        return window.open(link.url, (oursignal.options.open_blank ? '_blank' : '_self'));
      }

      // TODO: Animation chaining.
      $meta.show(function () {
        layout(link);
        $meta_background.fadeTo(100, 0.5, function () {
          $meta_body.slideDown(400, 'swing', function () {
            $meta_body.swipe('enable');
          });
        });
      });
    };

    meta.close = function () {
      // TODO: Cleaner animation chaining.
      $meta_body.swipe('disable').slideUp(400, 'swing', function () {
        $meta_background.fadeTo(100, 0, function () {
          $meta.hide();
        });
      });
    };

    return meta;
  })(oursignal.meta || {});

  /*
    Timeline.
  */
  oursignal.timeline = (function (timeline) {
    // TODO: Golf, document fragment, minimise appends etc.
    function generate(time) {
      var now  = new Date(),
          date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
          $day = $('<li/>', {class: 'day'}); // TODO: 'data-time': at midnight.
      for (var hour = 0; hour < 24; hour++) {
        date.setHours(hour);
        var $hour = $('<ol/>', {class: 'hour', 'data-hour': hour}); // TODO: 'data-time' at the hour.
        for (var minute = 0; minute < 60; minute += 5) {
          var $minute = $('<li/>', {class: 'minute', 'data-minute': minute}); // TODO: 'data-time' at the minute.
          if (minute == 0) {
            var $time = $('<abbr/>', {
              class: 'datetime',
              title: date.toString(),
              text:  (hour > 11 ? (hour > 12 ? hour - 12 : hour) + 'pm' : (hour == 0 ? 12 : hour) + 'am')
            });
            $minute.append($time);
          }
          $hour.append($minute);
        }
        $day.append($hour);
      }
      $timeline.append($day);

      $timeline.mousedown(function (event) {
        $(this)
          .data('down', true)
          .data('x', event.clientX)
          .data('scrollLeft', this.scrollLeft);

        return false;
      }).mouseup(function (event) {
        $(this).data('down', false);
      }).mousemove(function (event) {
        if ($(this).data('down') == true) {
          this.scrollLeft = $(this).data('scrollLeft') + $(this).data('x') - event.clientX;
        }
      })
      // .mousewheel(function (event, delta) { this.scrollLeft -= (delta * 30); })
      .css({
        'overflow' : 'hidden',
        'cursor' : '-moz-grab'
      });
    }

    timeline.update = function (time) {
      $(function () { generate(time || new Date()); });
    };

    return timeline;
  })(oursignal.timeline || {});

  // Display current timestep and timeline.
  oursignal.now = function () {
    oursignal.options.init();
    oursignal.timestep.update();
    // oursignal.timeline.update();
  };

  $(function () {
    // $timeline = $('#timeline');
    $timestep = $('#timestep');
  });

  return oursignal;
})(jQuery, oursignal || {});

oursignal.now();
