(function(){
  "use strict";

  var ROOM_LABELS = {
    xiaowu:{ name:"曉霧", subtitle:"山景露台雙人房" },
    chaxiu:{ name:"茶岫", subtitle:"茶園景觀雙人房" },
    yunqi: { name:"雲棲", subtitle:"山景四人房" }
  };

  var ROOMS = {
    xiaowu:{ id:"xiaowu", capMin:2, capMax:2, price:{weekday:8800, weekend:11000, peak:13500} },
    chaxiu:{ id:"chaxiu", capMin:2, capMax:2, price:{weekday:9200, weekend:12500, peak:15500} },
    yunqi: { id:"yunqi",  capMin:2, capMax:4, price:{weekday:11000, weekend:15000, peak:19500} }
  };
  var ROOM_ORDER = ["xiaowu","chaxiu","yunqi"];

  // Sample "consecutive holiday" peak-rate windows for demonstration.
  // Adjust these to match the property's real published holiday calendar.
  var PEAK_RANGES = [
    ["2026-09-25","2026-09-27"],
    ["2026-10-09","2026-10-11"],
    ["2026-11-27","2026-11-29"],
    ["2027-01-01","2027-01-03"],
    ["2027-02-13","2027-02-15"]
  ];

  // Nights already reserved, per room ("YYYY-MM-DD"). This is the ONLY
  // place that needs editing to keep the calendar in sync with real
  // bookings: when a new reservation comes in, add its check-in..check-out
  // nights here (checkout night itself is NOT included, same as the
  // booking flow's own math); when a stay is cancelled, remove its dates.
  var BOOKED_DATES = {
    xiaowu:["2026-09-14","2026-09-15","2026-09-21","2026-09-22","2026-09-23","2026-10-06","2026-10-07","2026-10-08","2026-10-20","2026-11-03","2026-11-04","2026-11-21","2026-11-22"],
    chaxiu:["2026-09-13","2026-09-17","2026-09-18","2026-09-19","2026-09-27","2026-09-28","2026-09-29","2026-10-12","2026-10-13","2026-10-29","2026-10-30","2026-10-31","2026-11-16","2026-11-17"],
    yunqi: ["2026-09-16","2026-09-24","2026-09-25","2026-10-02","2026-10-03","2026-10-04","2026-10-16","2026-10-24","2026-10-25","2026-11-09","2026-11-10","2026-11-11","2026-11-25","2026-11-26"]
  };

  /* ======================= date helpers ======================= */
  function pad(n){ return n<10 ? "0"+n : ""+n; }
  function toISO(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
  function addDays(d,n){ var r=new Date(d); r.setDate(r.getDate()+n); return r; }
  function startOfDay(d){ var r=new Date(d); r.setHours(0,0,0,0); return r; }
  function sameYM(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth(); }
  function firstOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function fmtMoney(n){ return "NT$" + n.toLocaleString("en-US"); }
  var WD_ZH = ["日","一","二","三","四","五","六"];
  function fmtDateZh(d){ return (d.getMonth()+1)+"/"+d.getDate()+"（"+WD_ZH[d.getDay()]+"）"; }

  var today = startOfDay(new Date());
  var minDate = addDays(today,1);
  var maxDate = (function(){ var m=new Date(today); m.setMonth(m.getMonth()+3); return m; })();

  function isPeak(iso){
    for (var i=0;i<PEAK_RANGES.length;i++){
      if (iso >= PEAK_RANGES[i][0] && iso <= PEAK_RANGES[i][1]) return true;
    }
    return false;
  }
  function dayTier(d){
    var iso = toISO(d);
    if (isPeak(iso)) return "peak";
    var wd = d.getDay();
    if (wd===0 || wd===6) return "weekend";
    return "weekday";
  }
  var bookedSetCache = {};
  function bookedSet(roomId){
    if (bookedSetCache[roomId]) return bookedSetCache[roomId];
    var s = {};
    BOOKED_DATES[roomId].forEach(function(iso){ s[iso] = true; });
    bookedSetCache[roomId] = s;
    return s;
  }

  /* ======================= query param ======================= */
  function getQueryParam(name){
    var params = new URLSearchParams(location.search);
    return params.get(name);
  }

  /* ======================= booking state ======================= */
  var requestedRoom = getQueryParam("room");
  var bkState = {
    room: (requestedRoom && ROOMS[requestedRoom]) ? requestedRoom : "xiaowu",
    calMonth: firstOfMonth(minDate),
    checkin: null,
    checkout: null,
    step: 1
  };

  function renderRoomTabs(){
    var wrap = document.getElementById("roomTabs");
    wrap.innerHTML = ROOM_ORDER.map(function(id){
      var r = ROOMS[id];
      var l = ROOM_LABELS[id];
      return '<button type="button" class="room-tab" data-room="'+id+'" aria-pressed="'+(id===bkState.room)+'">' +
        '<b>'+l.name+' · '+l.subtitle+'</b>' +
        '<span class="from">'+fmtMoney(r.price.weekday)+' 起 / 晚</span>' +
      '</button>';
    }).join("");
    wrap.querySelectorAll(".room-tab").forEach(function(btn){
      btn.addEventListener("click", function(){
        bkState.room = btn.getAttribute("data-room");
        bkState.checkin = null; bkState.checkout = null;
        renderRoomTabs(); renderGuestsSelect(); renderCalendar(); renderSummary();
      });
    });
  }

  function renderGuestsSelect(){
    var r = ROOMS[bkState.room];
    var sel = document.getElementById("in-guests");
    var opts = [];
    for (var n=r.capMin; n<=r.capMax; n++){ opts.push('<option value="'+n+'">'+n+' 人</option>'); }
    sel.innerHTML = opts.join("");
  }

  /* ---- calendar ---- */
  var DOW_LABELS = ["日","一","二","三","四","五","六"];
  function renderCalendar(){
    var dowWrap = document.getElementById("calDow");
    dowWrap.innerHTML = DOW_LABELS.map(function(l){ return '<div class="cal-dow">'+l+'</div>'; }).join("");

    var month = bkState.calMonth;
    document.getElementById("calMonthLabel").textContent = month.getFullYear()+" 年 "+(month.getMonth()+1)+" 月";

    var prevBtn = document.getElementById("calPrev");
    var nextBtn = document.getElementById("calNext");
    prevBtn.disabled = sameYM(month, firstOfMonth(minDate));
    nextBtn.disabled = sameYM(month, firstOfMonth(maxDate));

    var grid = document.getElementById("calGrid");
    var firstDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    var daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
    var booked = bookedSet(bkState.room);

    var cells = [];
    for (var i=0;i<firstDow;i++){ cells.push('<div class="cal-cell empty"></div>'); }

    for (var day=1; day<=daysInMonth; day++){
      var d = new Date(month.getFullYear(), month.getMonth(), day);
      var iso = toISO(d);
      var classes = ["cal-cell"];
      var priceHtml = "";
      var disabled = false;

      if (d < minDate || d > maxDate){
        classes.push("disabled"); disabled = true;
      } else if (booked[iso]){
        classes.push("booked"); disabled = true;
      } else {
        var tier = dayTier(d);
        classes.push("avail", tier);
        priceHtml = '<span class="p">'+ROOMS[bkState.room].price[tier].toLocaleString("en-US")+'</span>';
      }

      if (bkState.checkin && iso===toISO(bkState.checkin)) classes.push("checkin");
      if (bkState.checkout && iso===toISO(bkState.checkout)) classes.push("checkout");
      if (bkState.checkin && bkState.checkout && d>bkState.checkin && d<bkState.checkout) classes.push("in-range");

      cells.push('<button type="button" class="'+classes.join(" ")+'" data-date="'+iso+'" '+(disabled?"disabled":"")+'>' +
        '<span class="d">'+day+'</span>'+priceHtml+
      '</button>');
    }
    grid.innerHTML = cells.join("");

    grid.querySelectorAll(".cal-cell.avail").forEach(function(cell){
      cell.addEventListener("click", function(){
        onPickDate(new Date(cell.getAttribute("data-date")+"T00:00:00"));
      });
    });
  }

  document.getElementById("calPrev").addEventListener("click", function(){
    var m = new Date(bkState.calMonth); m.setMonth(m.getMonth()-1);
    if (m < firstOfMonth(minDate)) m = firstOfMonth(minDate);
    bkState.calMonth = m; renderCalendar();
  });
  document.getElementById("calNext").addEventListener("click", function(){
    var m = new Date(bkState.calMonth); m.setMonth(m.getMonth()+1);
    if (m > firstOfMonth(maxDate)) m = firstOfMonth(maxDate);
    bkState.calMonth = m; renderCalendar();
  });

  function onPickDate(d){
    if (!bkState.checkin || bkState.checkout){
      bkState.checkin = d; bkState.checkout = null;
    } else if (d <= bkState.checkin){
      bkState.checkin = d; bkState.checkout = null;
    } else {
      var booked = bookedSet(bkState.room);
      var ok = true;
      for (var c = addDays(bkState.checkin,1); c < d; c = addDays(c,1)){
        if (booked[toISO(c)]){ ok = false; break; }
      }
      if (ok){ bkState.checkout = d; }
      else { bkState.checkin = d; bkState.checkout = null; }
    }
    renderCalendar();
    renderSummary();
  }

  function computeStay(){
    if (!bkState.checkin || !bkState.checkout) return null;
    var nights = Math.round((bkState.checkout - bkState.checkin)/86400000);
    var total = 0;
    var breakdown = {weekday:0, weekend:0, peak:0};
    for (var d = new Date(bkState.checkin); d < bkState.checkout; d = addDays(d,1)){
      var tier = dayTier(d);
      breakdown[tier] += 1;
      total += ROOMS[bkState.room].price[tier];
    }
    return { nights: nights, total: total, breakdown: breakdown };
  }

  function renderSummary(){
    var stay = computeStay();
    var l = ROOM_LABELS[bkState.room];
    var roomName = l.name+" · "+l.subtitle;
    var html;
    if (!stay){
      html = '<p class="summary-empty">請先在行事曆選擇入住與退房日期。</p>';
    } else {
      var tierLabels = {weekday:"平日", weekend:"假日", peak:"連假定價"};
      var lines = "";
      ["weekday","weekend","peak"].forEach(function(t){
        if (stay.breakdown[t]>0){
          lines += '<div class="summary-row"><span class="k">'+tierLabels[t]+' × '+stay.breakdown[t]+' 晚</span><span class="v">'+fmtMoney(ROOMS[bkState.room].price[t]*stay.breakdown[t])+'</span></div>';
        }
      });
      html = '' +
        '<div class="summary-row"><span class="k">房型</span><span class="v">'+roomName+'</span></div>' +
        '<div class="summary-row"><span class="k">入住</span><span class="v">'+fmtDateZh(bkState.checkin)+'</span></div>' +
        '<div class="summary-row"><span class="k">退房</span><span class="v">'+fmtDateZh(bkState.checkout)+'</span></div>' +
        '<div class="summary-row"><span class="k">晚數</span><span class="v">'+stay.nights+' 晚</span></div>' +
        lines +
        '<div class="summary-total"><span class="k">總金額</span><span class="v">'+fmtMoney(stay.total)+'</span></div>';
    }
    document.getElementById("summaryBody").innerHTML = html;
    document.getElementById("summaryBody2").innerHTML = html;
    document.getElementById("toStep2").disabled = !stay;
  }

  /* ---- step nav ---- */
  function goStep(n, silent){
    bkState.step = n;
    document.getElementById("bkStep1").hidden = n!==1;
    document.getElementById("bkStep2").hidden = n!==2;
    document.getElementById("bkStep3").hidden = n!==3;
    document.querySelectorAll("#stepsBar .step").forEach(function(s){
      s.classList.toggle("active", parseInt(s.getAttribute("data-step"),10)===n);
    });
    if (!silent) window.scrollTo({top:0, behavior:"smooth"});
  }

  document.getElementById("toStep2").addEventListener("click", function(){ goStep(2); });
  document.getElementById("toStep1").addEventListener("click", function(){ goStep(1); });

  /* ---- validation ---- */
  function setFieldError(id, hasError){
    document.getElementById(id).classList.toggle("error", !!hasError);
  }
  function validExpiry(v){
    var m = /^(\d{2})\/(\d{2})$/.exec(v);
    if (!m) return false;
    var mm = parseInt(m[1],10), yy = parseInt(m[2],10);
    if (mm<1 || mm>12) return false;
    var now = new Date();
    var expiry = new Date(2000+yy, mm, 0);
    return expiry >= startOfDay(now);
  }
  document.getElementById("in-expiry").addEventListener("input", function(e){
    var v = e.target.value.replace(/[^\d]/g,"").slice(0,4);
    if (v.length>=3) v = v.slice(0,2)+"/"+v.slice(2);
    e.target.value = v;
  });
  document.getElementById("in-cardnum").addEventListener("input", function(e){
    var v = e.target.value.replace(/[^\d]/g,"").slice(0,16);
    e.target.value = v.replace(/(.{4})/g,"$1 ").trim();
  });
  document.getElementById("in-cvv").addEventListener("input", function(e){
    e.target.value = e.target.value.replace(/[^\d]/g,"").slice(0,4);
  });
  document.getElementById("in-phone").addEventListener("input", function(e){
    e.target.value = e.target.value.replace(/[^\d+\-\s]/g,"");
  });

  function validateForm(){
    var name = document.getElementById("in-name").value.trim();
    var phone = document.getElementById("in-phone").value.trim();
    var email = document.getElementById("in-email").value.trim();
    var cardname = document.getElementById("in-cardname").value.trim();
    var cardnum = document.getElementById("in-cardnum").value.replace(/\s/g,"");
    var expiry = document.getElementById("in-expiry").value.trim();
    var cvv = document.getElementById("in-cvv").value.trim();
    var agree = document.getElementById("in-agree").checked;

    var ok = true;
    function check(id, cond){ setFieldError(id, !cond); if(!cond) ok=false; return cond; }

    check("f-name", name.length>0);
    check("f-phone", /^[0-9+\-\s]{8,16}$/.test(phone));
    check("f-email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    check("f-cardname", cardname.length>0);
    check("f-cardnum", cardnum.length>=13 && cardnum.length<=16);
    check("f-expiry", validExpiry(expiry));
    check("f-cvv", /^\d{3,4}$/.test(cvv));
    check("f-agree", agree);

    return ok ? {name:name, phone:phone, email:email} : null;
  }

  document.getElementById("submitBooking").addEventListener("click", function(){
    var data = validateForm();
    if (!data) return;
    var stay = computeStay();
    var l = ROOM_LABELS[bkState.room];
    var roomName = l.name+" · "+l.subtitle;
    document.getElementById("confirmGreeting").textContent = "感謝 "+data.name+" 的預訂！以下是本次訂房內容：";
    document.getElementById("confirmDetails").innerHTML =
      '<div class="summary-row" style="border-top:none;"><span class="k">房型</span><span class="v">'+roomName+'</span></div>' +
      '<div class="summary-row"><span class="k">入住</span><span class="v">'+fmtDateZh(bkState.checkin)+'</span></div>' +
      '<div class="summary-row"><span class="k">退房</span><span class="v">'+fmtDateZh(bkState.checkout)+'</span></div>' +
      '<div class="summary-row"><span class="k">晚數</span><span class="v">'+stay.nights+' 晚</span></div>' +
      '<div class="summary-row"><span class="k">聯絡電話</span><span class="v">'+data.phone+'</span></div>' +
      '<div class="summary-row"><span class="k">確認信將寄送至</span><span class="v">'+data.email+'</span></div>' +
      '<div class="summary-total"><span class="k">總金額</span><span class="v">'+fmtMoney(stay.total)+'</span></div>';
    goStep(3);
  });

  document.getElementById("restartBooking").addEventListener("click", function(){
    bkState.checkin = null; bkState.checkout = null;
    document.getElementById("guestForm").reset();
    document.querySelectorAll(".field.error").forEach(function(f){ f.classList.remove("error"); });
    renderCalendar(); renderSummary();
    goStep(1);
  });

  /* ======================= init ======================= */
  renderRoomTabs();
  renderGuestsSelect();
  renderCalendar();
  renderSummary();
})();
