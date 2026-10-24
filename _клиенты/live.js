/* Живое поведение шести макетов. Первый экран не меняется, всё появляется только после действий человека. */
(() => {
  const page = location.pathname.split('/').pop().replace('.html', '');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rub = n => n.toLocaleString('ru-RU') + ' ₽';
  const css = t => document.head.insertAdjacentHTML('beforeend', `<style>${t}</style>`);
  const scrollTo = el => el.scrollIntoView({ behavior: 'smooth', block: 'start' });

  css(`
    .lv-toast { position: fixed; left: 50%; bottom: 28px; transform: translate(-50%, 30px); opacity: 0; z-index: 99;
      padding: 14px 22px; border-radius: 14px; font-size: 16px; font-weight: 500; max-width: min(92vw, 520px);
      box-shadow: 0 18px 40px -16px rgba(0,0,0,.45); transition: transform .35s cubic-bezier(.2,.8,.2,1), opacity .35s; pointer-events: none; }
    .lv-toast.show { transform: translate(-50%, 0); opacity: 1; }
    .lv-pop { animation: lvpop .45s cubic-bezier(.2,.8,.2,1); }
    @keyframes lvpop { 40% { transform: scale(1.12); } }
    .lv-flash { animation: lvflash .7s ease-out; }
    @keyframes lvflash { from { box-shadow: 0 0 0 6px var(--lv-accent, #000); } to { box-shadow: 0 0 0 0 transparent; } }
    @media (prefers-reduced-motion: reduce) { .lv-pop, .lv-flash { animation: none; } .lv-toast { transition: none; } }
  `);
  let toastTimer;
  const toast = (text, bg, fg = '#fff') => {
    let t = $('.lv-toast');
    if (!t) { t = document.createElement('div'); t.className = 'lv-toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = text; t.style.background = bg; t.style.color = fg;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  };
  const pop = el => { el.classList.remove('lv-pop'); void el.offsetWidth; el.classList.add('lv-pop'); };
  const flash = el => { el.classList.remove('lv-flash'); void el.offsetWidth; el.classList.add('lv-flash'); };

  const sites = {
    /* Пекарня: бронь хлеба, остатки уменьшаются, сумма считается */
    opara() {
      css(`.loaf, .step i, .order .pick, .hero .btn { cursor: pointer; } .loaf { --lv-accent: #2337c6; border-radius: 18px; transition: transform .2s; }
        .loaf:hover { transform: translateY(-3px); } .left span { transition: width .5s cubic-bezier(.2,.8,.2,1); }
        .order .pick.ok { background: #1f7a4d; } .line { animation: lvpop .4s; }`);
      const loaves = $$('.loaf').map(el => {
        const [rest, total] = $('.rest', el).textContent.match(/\d+/g).map(Number);
        return { el, name: $('h3', el).textContent, price: parseInt($('.meta b', el).textContent.replace(/\D/g, '')), rest, total };
      });
      const order = [{ l: loaves[0], q: 1 }, { l: loaves[1], q: 2 }];
      const box = $('.order'), total = $('.total span:last-child', box), cart = $('.cart'), pick = $('.pick', box);
      const draw = () => {
        $$('.line', box).forEach(x => x.remove());
        const anchor = $('.total', box);
        order.forEach((o, i) => anchor.insertAdjacentHTML('beforebegin', `<div class="line" data-i="${i}"><span>${o.l.name}</span><span class="step"><i data-d="-1">−</i>${o.q}<i data-d="1">+</i></span><b>${rub(o.l.price * o.q)}</b></div>`));
        total.textContent = rub(order.reduce((s, o) => s + o.l.price * o.q, 0));
        cart.textContent = 'Бронь · ' + order.reduce((s, o) => s + o.q, 0);
        pop(cart); pop(total);
        pick.classList.remove('ok'); pick.textContent = 'Заберу с 8:00 до 12:00';
      };
      const setRest = l => {
        $('.rest', l.el).textContent = l.rest > 0 ? `Осталось ${l.rest} из ${l.total}` : 'Бронь на завтра закрыта';
        $('.left span', l.el).style.width = (1 - l.rest / l.total) * 100 + '%';
      };
      $$('.line', box).forEach((x, i) => { x.dataset.i = i; const st = $$('.step i', x); st[0].dataset.d = -1; st[1].dataset.d = 1; });
      const change = (l, d) => {
        if (d > 0 && l.rest === 0) return toast(`${l.name} на завтра закончился. Попробуйте другой хлеб.`, '#14172b');
        let o = order.find(x => x.l === l);
        if (!o) { o = { l, q: 0 }; order.push(o); }
        o.q += d; l.rest -= d; setRest(l);
        if (o.q <= 0) order.splice(order.indexOf(o), 1);
        draw();
      };
      loaves.forEach(l => l.el.addEventListener('click', () => { change(l, 1); flash(l.el); }));
      box.addEventListener('click', e => {
        const i = e.target.closest('.step i'); if (!i) return;
        change(order[+i.closest('.line').dataset.i].l, +i.dataset.d);
      });
      pick.addEventListener('click', () => {
        if (!order.length) return toast('Добавьте хотя бы один хлеб.', '#14172b');
        pick.classList.add('ok'); pick.textContent = 'Бронь № 214 принята';
        toast('Бронь № 214. Пакет с вашим именем будет у кассы с 8:00.', '#1f7a4d');
      });
      $('.hero .btn').addEventListener('click', () => scrollTo($$('.sec')[0]));
    },

    /* Клиника: врач, день, время, телефон */
    zubr() {
      css(`.days div:not(.on), .slots span:not(.off), .doc em, .card, .btn { cursor: pointer; }
        .days div, .slots span { transition: background .2s, border-color .2s, color .2s; }
        .days div:hover:not(.on), .slots span:hover:not(.off):not(.on) { border-color: var(--forest); }
        .lv-phone label { display: block; font-size: 14px; color: var(--muted); margin: 22px 0 8px; }
        .lv-phone input { width: 100%; font: 500 22px var(--f); padding: 14px 16px; border: 1px solid var(--line); border-radius: 12px; outline: none; }
        .lv-phone input:focus { border-color: var(--forest); box-shadow: 0 0 0 3px var(--mint); }
        .lv-sum { background: var(--mint); border-radius: 16px; padding: 16px; margin-top: 18px; }
        .lv-sum b { display: block; font-weight: 500; font-size: 18px; }
        .lv-sum span { color: var(--muted); font-size: 15px; }
        .book [hidden] { display: none !important; }
        .lv-ok { text-align: center; padding: 30px 0 10px; animation: lvpop .5s; }
        .lv-ok i { width: 72px; height: 72px; border-radius: 50%; background: var(--forest); color: #fff; display: grid; place-items: center; margin: 0 auto 16px; font: normal 36px/1 var(--f); }
        .lv-ok h3 { font-size: 26px !important; margin: 0 0 8px !important; }
        .lv-ok p { color: var(--muted); }
        .card { --lv-accent: #0f3a2f; border-radius: 18px; }`);
      const book = $('.book'), dayNames = { пн: 'понедельник', вт: 'вторник', ср: 'среду', чт: 'четверг', пт: 'пятницу', сб: 'субботу' };
      const docs = [['ИС', 'Ирина Сомова', 'терапевт, 14 лет практики', 'Кабинет 1'], ['ПГ', 'Павел Гуров', 'хирург, имплантация', 'Кабинет 3'], ['АЛ', 'Анна Лапина', 'детский стоматолог', 'Детский кабинет']];
      const times = ['9:00', '9:40', '10:20', '11:00', '11:40', '13:00', '13:40', '15:00', '15:40', '16:20'];
      let doc = 0, day = $('.days .on'), slot = '11:00';
      const timeH3 = $$('h3', book)[1], slots = $('.slots', book);
      const setDoc = i => {
        doc = i; const [a, n, s] = docs[i];
        $('.doc .ava').textContent = a; $('.doc b').textContent = n; $('.doc span:not(.ava)').textContent = s; pop($('.doc'));
        drawSlots();
      };
      const drawSlots = () => {
        const seed = $$('.days div').indexOf(day) * 3 + doc * 7;
        const off = times.map((_, i) => (i * 5 + seed) % 7 < 2);
        let first = off.findIndex(x => !x);
        slot = times[first];
        slots.innerHTML = times.map((t, i) => `<span class="${off[i] ? 'off' : i === first ? 'on' : ''}">${t}</span>`).join('');
        pop(slots);
      };
      $('.days').addEventListener('click', e => {
        const d = e.target.closest('.days div'); if (!d || d === day) return;
        day.classList.remove('on'); d.classList.add('on'); day = d;
        const short = d.firstChild.textContent.trim();
        timeH3.textContent = `Свободное время ${short === 'вт' ? 'во' : 'в'} ${dayNames[short]}`;
        drawSlots();
      });
      slots.addEventListener('click', e => {
        const s = e.target.closest('span'); if (!s || s.classList.contains('off')) return;
        $$('span', slots).forEach(x => x.classList.toggle('on', x === s)); slot = s.textContent;
      });
      $('.doc em').addEventListener('click', () => setDoc((doc + 1) % docs.length));
      $$('.card').forEach((c, i) => c.addEventListener('click', () => { setDoc(i); window.scrollTo({ top: 0, behavior: 'smooth' }); flash(book); }));
      $('.head .btn').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); flash(book); });
      const btn = $('.book .btn'), steps = $$('.stepper div');
      let stage = 'time';
      const parts = () => [...book.children].filter(x => !x.matches('.stepper, .btn'));
      btn.addEventListener('click', () => {
        if (stage === 'time') {
          stage = 'phone';
          steps[1].className = 'done'; steps[2].className = 'now';
          parts().forEach(x => x.hidden = true);
          const dd = day.querySelector('b').textContent, mon = +dd < 20 ? 'ноября' : 'октября';
          btn.insertAdjacentHTML('beforebegin', `<div class="lv-phone"><div class="lv-sum"><b>${docs[doc][1]}</b><span>${day.firstChild.textContent.trim()}, ${dd} ${mon}, ${slot}. ${docs[doc][3]}, первый приём 1 500 ₽</span></div><label for="lv-tel">Телефон для подтверждения</label><input id="lv-tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (900) 000-00-00"></div>`);
          btn.textContent = 'Записаться';
          $('#lv-tel').focus({ preventScroll: true });
        } else if (stage === 'phone') {
          const v = $('#lv-tel').value.replace(/\D/g, '');
          if (v.length < 10) { flash($('#lv-tel')); return toast('Введите телефон, на него придёт подтверждение.', '#13201b'); }
          stage = 'done'; steps[2].className = 'done';
          const sum = $('.lv-sum').innerHTML;
          $('.lv-phone').outerHTML = `<div class="lv-ok"><i>✓</i><h3>Вы записаны</h3><p>Напомним за день сообщением.</p><div class="lv-sum" style="text-align:left">${sum}</div></div>`;
          btn.textContent = 'Записаться ещё раз';
        } else {
          stage = 'time'; steps[1].className = 'now'; steps[2].className = '';
          $('.lv-ok').remove(); parts().forEach(x => x.hidden = false); btn.textContent = 'Дальше: ваш телефон';
        }
      });
    },

    /* Прокат: выбор даты в календаре и бронь лодок */
    tihiy() {
      css(`.day.free, .day.few, .vestbtn, .route { cursor: pointer; } .day { transition: transform .2s, background .25s; }
        .day.free:hover, .day.few:hover { transform: translateY(-3px); }
        .lv-bk { margin-top: 18px; background: var(--pine); color: #fff; border-radius: 16px; padding: 22px 26px; display: flex; flex-wrap: wrap; gap: 18px 34px; align-items: center; animation: lvpop .45s; }
        .lv-bk .d { font: 800 40px/1 var(--cond); text-transform: uppercase; }
        .lv-bk .d small { display: block; font: 400 15px var(--text); color: #cfe0d6; text-transform: none; margin-top: 4px; }
        .lv-bk .q { display: flex; align-items: center; gap: 14px; font-weight: 600; font-size: 20px; }
        .lv-bk .q button { width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(255,255,255,.4); background: transparent; color: #fff; font-size: 20px; cursor: pointer; }
        .lv-bk .sum { margin-left: auto; font: 800 40px/1 var(--cond); }
        .lv-bk .vestbtn { padding: 16px 26px; }
        .route { transition: opacity .25s; } .route.lv-on img { outline: 4px solid var(--vest); outline-offset: -4px; }
        @container (max-width: 600px) { .lv-bk { padding: 16px; gap: 12px 20px; } .lv-bk .d, .lv-bk .sum { font-size: 30px; } .lv-bk .sum { margin-left: 0; } .lv-bk .vestbtn { width: 100%; } }`);
      $('.hero .vestbtn').addEventListener('click', () => scrollTo($('.avail')));
      let pick = $('.day.pick'), boats = 2, route = 'Губа и острова', bk;
      const free = d => parseInt(d.dataset.free ?? d.querySelector('span').textContent) || 0;
      $$('.day').forEach(d => { if (!d.classList.contains('past')) d.dataset.free = parseInt(d.querySelector('span').textContent) || 0; });
      const label = n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'лодка' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'лодки' : 'лодок'}`;
      const restore = d => { d.classList.remove('pick'); d.classList.add(free(d) <= 4 ? 'few' : 'free'); d.querySelector('span').textContent = label(free(d)); };
      const draw = () => {
        const n = free(pick); boats = Math.min(boats, n);
        if (!bk) { bk = document.createElement('div'); bk.className = 'lv-bk'; $('.cal').after(bk); }
        bk.innerHTML = `<div class="d">${pick.querySelector('b').textContent} июля<small>${route}, свободно ${label(n)}</small></div>
          <div class="q"><button data-d="-1" aria-label="Меньше лодок">−</button><span>${label(boats)}</span><button data-d="1" aria-label="Больше лодок">+</button></div>
          <div class="sum">${rub(boats * 2400)}</div><button class="vestbtn">Забронировать</button>`;
      };
      $('.cal').addEventListener('click', e => {
        const d = e.target.closest('.day'); if (!d || d.classList.contains('full') || d.classList.contains('past')) return;
        if (pick) restore(pick);
        d.classList.remove('free', 'few'); d.classList.add('pick'); d.querySelector('span').textContent = label(free(d)) + ', ваша дата';
        pick = d; pop(d); draw(); pop(bk);
      });
      $('.avail').addEventListener('click', e => {
        const b = e.target.closest('.lv-bk button'); if (!b) return;
        if (b.dataset.d) { boats = Math.max(1, Math.min(free(pick), boats + +b.dataset.d)); draw(); pop($('.lv-bk .sum')); return; }
        toast(`Готово: ${label(boats)} на ${pick.querySelector('b').textContent} июля. Инструктор позвонит накануне.`, '#ff6b1f', '#1a0d05');
        pick.dataset.free = free(pick) - boats; pick.querySelector('span').textContent = label(free(pick)) + ', ваша дата'; pop(pick);
      });
      $$('.route').forEach(r => r.addEventListener('click', () => {
        $$('.route').forEach(x => x.classList.toggle('lv-on', x === r)); route = $('h3', r).textContent;
        if (bk) { draw(); pop(bk); } else toast(`Маршрут «${route}». Теперь выберите дату в календаре.`, '#1f3b35');
      }));
    },

    /* Фестиваль: дни, жанры, свой список */
    plenka() {
      css(`.tabs span, .filters span, .film:not(.sold), .tix { cursor: pointer; } .film { transition: opacity .3s, filter .3s, background .2s; }
        .film.lv-dim { opacity: .18; filter: grayscale(1); } .film:not(.sold):hover { border-color: var(--ink); }
        .track { transition: opacity .2s; } .track.lv-swap { opacity: 0; }`);
      const genre = f => f.classList.contains('talk') ? 'Встречи с авторами' : /анимац/i.test(f.textContent) ? 'Анимация' : /Документ|Ретро|Утро|ветер/i.test(f.textContent) ? 'Документальное' : 'Игровое';
      const tracks = $$('.track'), base = tracks.map(t => t.innerHTML);
      const mineCount = () => { const n = $$('.film.mine').length; const el = $$('.filters span').pop(); el.textContent = 'Мой список: ' + n; pop(el); };
      let filter = 'Все жанры';
      const applyFilter = () => $$('.film').forEach(f => f.classList.toggle('lv-dim', filter === 'Все жанры' ? false : filter.startsWith('Мой список') ? !f.classList.contains('mine') : genre(f) !== filter));
      $('.tabs').addEventListener('click', e => {
        const s = e.target.closest('span'); if (!s || s.classList.contains('on')) return;
        $$('.tabs span').forEach(x => x.classList.toggle('on', x === s));
        const k = $$('.tabs span').indexOf(s);
        tracks.forEach(t => t.classList.add('lv-swap'));
        setTimeout(() => {
          tracks.forEach((t, i) => {
            t.innerHTML = base[(i + k) % base.length];
            $$('.film', t).forEach((f, j) => { f.classList.remove('mine', 'sold'); if ((j + k) % 4 === 1) f.classList.add('mine'); if (k === 2 && j === 2) f.classList.add('sold'); });
            t.classList.remove('lv-swap');
          });
          mineCount(); applyFilter();
        }, 200);
      });
      $('.filters').addEventListener('click', e => {
        const s = e.target.closest('span'); if (!s) return;
        $$('.filters span').forEach(x => x.classList.toggle('on', x === s));
        filter = s.textContent; applyFilter();
      });
      $('.board').addEventListener('click', e => {
        const f = e.target.closest('.film'); if (!f) return;
        if (f.classList.contains('sold')) return toast('Билетов нет. Добавили в лист ожидания, напишем, если место освободится.', '#7a1027');
        f.classList.toggle('mine'); pop(f); mineCount(); applyFilter();
        if (f.classList.contains('mine')) toast(`«${$('b', f).textContent}» в вашем списке. Он хранится в этом браузере.`, '#1a1214', '#f3c234');
      });
      $('.tix').addEventListener('click', () => scrollTo($('.sched')));
    },

    /* Юристы: дела раскрываются, форма описания ситуации */
    suharev() {
      css(`.row { cursor: pointer; transition: background .2s; } .row:hover { background: #faf6f6; } .hero .btn { cursor: pointer; }
        .row .lv-more { grid-column: 1 / -1; display: grid; grid-template-rows: 0fr; transition: grid-template-rows .4s cubic-bezier(.2,.8,.2,1); }
        .row.lv-open .lv-more { grid-template-rows: 1fr; } .row .lv-more > div { overflow: hidden; }
        .lv-more p { color: var(--muted); max-width: 70ch; padding-top: 10px; }
        .lv-more dl { display: flex; gap: 40px; margin-top: 14px; } .lv-more dt { font-size: 13px; color: var(--muted); } .lv-more dd { font: 600 20px var(--serif); color: var(--wine); }
        .lv-modal { position: fixed; inset: 0; background: rgba(40,8,16,.55); display: grid; place-items: center; z-index: 50; opacity: 0; transition: opacity .3s; padding: 16px; }
        .lv-modal.show { opacity: 1; }
        .lv-modal form { background: #fff; padding: 34px; width: min(560px, 100%); box-shadow: 14px 14px 0 var(--wine-deep); transform: translateY(20px); transition: transform .35s cubic-bezier(.2,.8,.2,1); }
        .lv-modal.show form { transform: none; }
        .lv-modal h2 { font: 500 30px/1.15 var(--serif); margin-bottom: 8px; } .lv-modal p { color: var(--muted); font-size: 15px; }
        .lv-modal label { display: block; font-size: 13px; color: var(--muted); margin: 18px 0 6px; }
        .lv-modal textarea, .lv-modal input { width: 100%; font: 400 17px var(--sans); border: 1px solid var(--line); padding: 12px 14px; outline: none; }
        .lv-modal textarea:focus, .lv-modal input:focus { border-color: var(--wine); }
        .lv-modal textarea { height: 120px; resize: none; }
        .lv-modal button { margin-top: 22px; background: var(--wine); color: #fff; border: 0; padding: 16px 26px; font: 500 16px var(--sans); cursor: pointer; }`);
      const more = {
        '2022/118': ['Сеть полгода не платила за поставки и подала встречный иск о браке. Провели экспертизу и доказали, что брак появился на складе покупателя.', 'Взыскали', '14,2 млн ₽', '7 мес.', '3'],
        '2022/55': ['Кредиторы требовали привлечь бывшего директора к субсидиарной ответственности. Собрали переписку и показали, что решения он принимал добросовестно.', 'Отбили', '38 млн ₽', '11 мес.', '2'],
        '2023/20': ['Арендодатель удерживал залог и требовал неустойку. Нашли нарушения в акте приёмки, стороны договорились без суда.', 'Мировое', '2,6 млн ₽', '3 мес.', '1'],
        '2022/91': ['Типография заявила, что станки пришли с дефектом. Экспертиза встала на сторону поставщика. Дело проиграно, это честно указано в списке.', 'Сумма спора', '5,1 млн ₽', '9 мес.', '2'],
        '2023/77': ['Застройщик обанкротился, подрядчика не хотели включать в реестр. Доказали реальность работ по исполнительной документации.', 'Включили', '9,8 млн ₽', '5 мес.', '2']
      };
      $$('.row').forEach(r => {
        const [t, k, s, d, n] = more[$('.n', r).textContent];
        r.insertAdjacentHTML('beforeend', `<div class="lv-more"><div><p>${t}</p><dl><div><dt>${k}</dt><dd>${s}</dd></div><div><dt>Срок</dt><dd>${d}</dd></div><div><dt>Инстанций</dt><dd>${n}</dd></div></dl></div></div>`);
        r.addEventListener('click', () => { const open = !r.classList.contains('lv-open'); $$('.row').forEach(x => x.classList.remove('lv-open')); r.classList.toggle('lv-open', open); });
      });
      $('.hero .btn').addEventListener('click', () => {
        const m = document.createElement('div'); m.className = 'lv-modal';
        m.innerHTML = `<form><h2>Опишите ситуацию</h2><p>Прочитает партнёр бюро и ответит до конца рабочего дня. Первая консультация 30 минут бесплатно.</p>
          <label for="lv-s">Что случилось</label><textarea id="lv-s" name="situation" placeholder="Кто с кем спорит и о какой сумме…"></textarea>
          <label for="lv-p">Телефон</label><input id="lv-p" name="tel" type="tel" autocomplete="tel" placeholder="+7 (900) 000-00-00"><button>Отправить юристу</button></form>`;
        document.body.append(m); requestAnimationFrame(() => m.classList.add('show'));
        const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 300); };
        m.addEventListener('click', e => { if (e.target === m) close(); });
        m.querySelector('form').addEventListener('submit', e => { e.preventDefault(); close(); toast('Отправлено. Партнёр бюро ответит до конца дня.', '#6a1a2a'); });
        $('#lv-s').focus({ preventScroll: true });
      });
    },

    /* Пряжа: фильтры по толщине, метражу и составу, корзина */
    sherst() {
      css(`.chips span, .checks label, .sw i, .item, .range i { cursor: pointer; } .range i { touch-action: none; }
        .item { transition: opacity .3s, transform .3s; --lv-accent: #a4362b; } .item:hover { transform: translateY(-3px); }
        .item.lv-hide { display: none; } .grid { transition: opacity .2s; } .lv-empty { grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--muted); }`);
      const items = $$('.item').map(el => ({ el, m: parseInt($('.spec span', el).textContent), comp: $('.comp', el).textContent.toLowerCase(), colors: parseInt($('.buy span', el).textContent), name: $('h3', el).textContent }));
      const thick = m => m >= 430 ? 'Тонкая' : m >= 300 ? 'Средняя' : 'Толстая';
      const range = $('.range'), bar = $('span', range), [h1, h2] = $$('i', range), vals = $$('.rangeval b');
      let lo = 22, hi = 62; // проценты шкалы
      const toM = p => Math.round((217.5 + p * 3.75) / 10) * 10;
      const comps = { 'Меринос': /меринос/, 'Альпака': /альпака/, 'Шерсть с хлопком': /шерсть|хлопок/, 'Мохер': /мохер/ };
      let compTouched = false; // пока состав не трогали, он не сужает выдачу
      const apply = () => {
        const th = $('.chips .on')?.textContent, on = compTouched ? $$('.checks label.on span').map(s => comps[s.textContent]) : [];
        let n = 0, shown = 0;
        items.forEach(it => {
          const ok = (!th || thick(it.m) === th) && it.m >= toM(lo) && it.m <= toM(hi) && (!compTouched || on.some(c => c.test(it.comp)));
          it.el.classList.toggle('lv-hide', !ok); if (ok) { n += it.colors * 2; shown++; }
        });
        $('.lv-empty')?.remove();
        if (!shown) $('.grid').insertAdjacentHTML('beforeend', '<p class="lv-empty">Под эти условия ничего нет. Расширьте метраж или уберите состав.</p>');
        const b = $('.bar b'); b.textContent = `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'моток' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'мотка' : 'мотков'}`; pop(b);
      };
      const drawRange = () => {
        bar.style.left = lo + '%'; bar.style.right = (100 - hi) + '%';
        h1.style.left = `calc(${lo}% - 10px)`; h2.style.right = `calc(${100 - hi}% - 10px)`;
        vals[0].textContent = toM(lo) + ' м'; vals[1].textContent = toM(hi) + ' м';
      };
      [h1, h2].forEach((h, k) => h.addEventListener('pointerdown', e => {
        e.preventDefault(); h.setPointerCapture?.(e.pointerId);
        const r = range.getBoundingClientRect();
        const move = ev => {
          const p = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100));
          if (k === 0) lo = Math.min(p, hi - 8); else hi = Math.max(p, lo + 8);
          drawRange();
        };
        const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); apply(); };
        document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
      }));
      $('.chips').addEventListener('click', e => {
        const s = e.target.closest('span'); if (!s) return;
        const was = s.classList.contains('on'); $$('.chips span').forEach(x => x.classList.remove('on')); if (!was) s.classList.add('on'); apply();
      });
      $$('.checks label').forEach(l => l.addEventListener('click', () => { compTouched = true; l.classList.toggle('on'); apply(); }));
      $('.sw').addEventListener('click', e => {
        const i = e.target.closest('i'); if (!i) return;
        $$('.sw i').forEach(x => x.classList.toggle('on', x === i));
        const g = $('.grid'); g.style.opacity = 0;
        setTimeout(() => { items.slice().sort(() => Math.random() - .5).forEach(it => g.prepend(it.el)); g.style.opacity = 1; }, 200);
      });
      let basket = 3;
      items.forEach(it => it.el.addEventListener('click', () => {
        basket++; const b = $('.basket'); b.textContent = 'Корзина, ' + basket; pop(b); flash(it.el);
        toast(`«${it.name}» в корзине. Доставим от 2 дней.`, '#1f1f1d');
      }));
    }
  };
  sites[page]?.();
})();
