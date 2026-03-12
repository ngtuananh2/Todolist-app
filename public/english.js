// ==================== ENGLISH LEARNING JS ====================
'use strict';

// ===== GRAMMAR LESSONS DATA =====
const LESSONS = [
  {
    id: 'present_simple',
    title: 'Thì Hiện Tại Đơn',
    subtitle: 'Simple Present',
    icon: '🔵',
    color: 'blue',
    badge: 'present',
    content: `
      <h4>📌 Công thức</h4>
      <div class="en-formula">
        <strong>(+)</strong> S + <code>V(s/es)</code> + O<br>
        <strong>(-)</strong> S + <code>do/does + not</code> + V + O<br>
        <strong>(?)</strong> <code>Do/Does</code> + S + V + O?
      </div>
      <h4>🎯 Cách dùng</h4>
      <p>1. Diễn tả thói quen, hành động lặp đi lặp lại.</p>
      <p>2. Sự thật hiển nhiên, chân lý.</p>
      <p>3. Lịch trình, thời gian biểu cố định.</p>
      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">She <strong>goes</strong> to school every day.</div>
        <div class="en-ex-vi">→ Cô ấy đi học mỗi ngày.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">Water <strong>boils</strong> at 100°C.</div>
        <div class="en-ex-vi">→ Nước sôi ở 100°C.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">The train <strong>leaves</strong> at 8 AM tomorrow.</div>
        <div class="en-ex-vi">→ Tàu khởi hành lúc 8 giờ sáng mai.</div>
      </div>
      <h4>⏰ Dấu hiệu nhận biết</h4>
      <p><strong>always, usually, often, sometimes, rarely, never, every day/week/month, on Mondays...</strong></p>
      <div class="en-note">⚠️ <strong>Lưu ý:</strong> Thêm <code>s/es</code> sau động từ khi chủ ngữ là ngôi thứ 3 số ít (he, she, it). Động từ kết thúc bằng -o, -ss, -sh, -ch, -x → thêm <code>es</code>.</div>
    `,
    exercises: [
      { q: 'She ___ (go) to work by bus every day.', options: ['goes', 'go', 'going', 'went'], correct: 0, explain: '"She" là ngôi 3 số ít → động từ thêm -es: goes' },
      { q: 'They ___ (not/like) spicy food.', options: ['don\'t like', 'doesn\'t like', 'not like', 'aren\'t like'], correct: 0, explain: '"They" là chủ ngữ số nhiều → dùng "don\'t + V"' },
      { q: '___ he ___ (speak) English fluently?', options: ['Does / speak', 'Do / speak', 'Does / speaks', 'Is / speak'], correct: 0, explain: '"He" là ngôi 3 số ít → dùng "Does + S + V(nguyên thể)?"' },
      { q: 'The sun ___ (rise) in the east.', options: ['rises', 'rise', 'is rising', 'rose'], correct: 0, explain: 'Sự thật hiển nhiên → thì hiện tại đơn. "The sun" số ít → "rises"' },
      { q: 'I usually ___ (have) breakfast at 7 AM.', options: ['have', 'has', 'am having', 'had'], correct: 0, explain: '"I" dùng động từ nguyên thể. "usually" là dấu hiệu hiện tại đơn' },
      { q: 'My mother ___ (teach) math at a high school.', options: ['teaches', 'teach', 'is teaching', 'taught'], correct: 0, explain: '"My mother" = "she" (ngôi 3 số ít). teach → teaches' },
      { q: 'We ___ (not/watch) TV in the morning.', options: ['don\'t watch', 'doesn\'t watch', 'aren\'t watch', 'not watch'], correct: 0, explain: '"We" là số nhiều → "don\'t + V nguyên thể"' },
      { q: 'The flight ___ (depart) at 6:30 PM.', options: ['departs', 'depart', 'is departing', 'departed'], correct: 0, explain: 'Lịch trình cố định → dùng hiện tại đơn. Ngôi 3 số ít → departs' },
    ]
  },
  {
    id: 'present_continuous',
    title: 'Thì Hiện Tại Tiếp Diễn',
    subtitle: 'Present Continuous',
    icon: '🟢',
    color: 'green',
    badge: 'present',
    content: `
      <h4>📌 Công thức</h4>
      <div class="en-formula">
        <strong>(+)</strong> S + <code>am/is/are</code> + V-<code>ing</code> + O<br>
        <strong>(-)</strong> S + <code>am/is/are + not</code> + V-ing + O<br>
        <strong>(?)</strong> <code>Am/Is/Are</code> + S + V-ing + O?
      </div>
      <h4>🎯 Cách dùng</h4>
      <p>1. Hành động đang xảy ra tại thời điểm nói.</p>
      <p>2. Hành động tạm thời quanh thời điểm hiện tại.</p>
      <p>3. Kế hoạch đã sắp xếp trong tương lai gần.</p>
      <p>4. Phàn nàn về hành động lặp lại (với <strong>always</strong>).</p>
      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">I <strong>am studying</strong> English right now.</div>
        <div class="en-ex-vi">→ Tôi đang học tiếng Anh ngay bây giờ.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">She <strong>is always complaining</strong> about everything!</div>
        <div class="en-ex-vi">→ Cô ấy lúc nào cũng phàn nàn về mọi thứ!</div>
      </div>
      <h4>⏰ Dấu hiệu nhận biết</h4>
      <p><strong>now, right now, at the moment, at present, currently, Look!, Listen!...</strong></p>
      <div class="en-note">⚠️ <strong>Lưu ý:</strong> Không dùng với các động từ chỉ trạng thái (stative verbs): know, understand, want, like, love, hate, believe, need, prefer...</div>
    `,
    exercises: [
      { q: 'Look! The children ___ (play) in the garden.', options: ['are playing', 'play', 'plays', 'played'], correct: 0, explain: '"Look!" là dấu hiệu → dùng hiện tại tiếp diễn' },
      { q: 'She ___ (not/work) today. She is sick.', options: ['isn\'t working', 'doesn\'t work', 'not working', 'wasn\'t working'], correct: 0, explain: 'Hành động tạm thời → isn\'t working' },
      { q: 'What ___ you ___ (do) right now?', options: ['are / doing', 'do / do', 'are / do', 'did / do'], correct: 0, explain: '"right now" → hiện tại tiếp diễn: "are you doing"' },
      { q: 'They ___ (move) to a new house next week.', options: ['are moving', 'move', 'moves', 'moved'], correct: 0, explain: 'Kế hoạch đã sắp xếp sẵn → dùng hiện tại tiếp diễn' },
      { q: 'He ___ (always/forget) his keys!', options: ['is always forgetting', 'always forgets', 'always forgetting', 'was always forgetting'], correct: 0, explain: 'Phàn nàn hành động lặp lại dùng "is always + V-ing"' },
      { q: 'I ___ (read) an interesting book at the moment.', options: ['am reading', 'read', 'reads', 'was reading'], correct: 0, explain: '"at the moment" → hiện tại tiếp diễn: am reading' },
    ]
  },
  {
    id: 'present_perfect',
    title: 'Thì Hiện Tại Hoàn Thành',
    subtitle: 'Present Perfect',
    icon: '🔷',
    color: 'blue',
    badge: 'present',
    content: `
      <h4>📌 Công thức</h4>
      <div class="en-formula">
        <strong>(+)</strong> S + <code>have/has</code> + V<code>3</code> (past participle) + O<br>
        <strong>(-)</strong> S + <code>have/has + not</code> + V3 + O<br>
        <strong>(?)</strong> <code>Have/Has</code> + S + V3 + O?
      </div>
      <h4>🎯 Cách dùng</h4>
      <p>1. Hành động bắt đầu trong quá khứ, kéo dài đến hiện tại.</p>
      <p>2. Hành động vừa mới hoàn thành.</p>
      <p>3. Kinh nghiệm, trải nghiệm cho đến hiện tại.</p>
      <p>4. Kết quả ở hiện tại của hành động quá khứ.</p>
      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">I <strong>have lived</strong> here for 5 years.</div>
        <div class="en-ex-vi">→ Tôi đã sống ở đây được 5 năm.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">She <strong>has just finished</strong> her homework.</div>
        <div class="en-ex-vi">→ Cô ấy vừa làm xong bài tập.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">I <strong>have never been</strong> to Japan.</div>
        <div class="en-ex-vi">→ Tôi chưa bao giờ đến Nhật Bản.</div>
      </div>
      <h4>⏰ Dấu hiệu nhận biết</h4>
      <p><strong>just, already, yet, ever, never, since, for, so far, recently, lately, up to now, until now...</strong></p>
      <div class="en-note">⚠️ <strong>since + mốc thời gian</strong> (since 2020, since Monday) — <strong>for + khoảng thời gian</strong> (for 3 years, for a long time)</div>
    `,
    exercises: [
      { q: 'I ___ (live) in Hanoi since 2018.', options: ['have lived', 'lived', 'am living', 'was living'], correct: 0, explain: '"since 2018" → hiện tại hoàn thành: have lived' },
      { q: 'She ___ (just/finish) her homework.', options: ['has just finished', 'just finished', 'is just finishing', 'just finishes'], correct: 0, explain: '"just" → hiện tại hoàn thành: has just finished' },
      { q: '___ you ever ___ (visit) Paris?', options: ['Have / visited', 'Did / visit', 'Are / visiting', 'Do / visit'], correct: 0, explain: '"ever" → kinh nghiệm → Have you ever visited...?' },
      { q: 'They ___ (not/see) that movie yet.', options: ['haven\'t seen', 'didn\'t see', 'don\'t see', 'aren\'t seeing'], correct: 0, explain: '"yet" → hiện tại hoàn thành phủ định: haven\'t seen' },
      { q: 'He ___ (work) here for 10 years.', options: ['has worked', 'worked', 'works', 'is working'], correct: 0, explain: '"for 10 years" → kéo dài đến hiện tại → has worked' },
      { q: 'I ___ (already/read) this book.', options: ['have already read', 'already read', 'already reading', 'had already read'], correct: 0, explain: '"already" → hiện tại hoàn thành: have already read' },
    ]
  },
  {
    id: 'present_perfect_continuous',
    title: 'Hiện Tại Hoàn Thành Tiếp Diễn',
    subtitle: 'Present Perfect Continuous',
    icon: '🟣',
    color: 'purple',
    badge: 'present',
    content: `
      <h4>📌 Công thức</h4>
      <div class="en-formula">
        <strong>(+)</strong> S + <code>have/has been</code> + V-<code>ing</code> + O<br>
        <strong>(-)</strong> S + <code>have/has + not + been</code> + V-ing + O<br>
        <strong>(?)</strong> <code>Have/Has</code> + S + <code>been</code> + V-ing + O?
      </div>
      <h4>🎯 Cách dùng</h4>
      <p>1. Nhấn mạnh tính liên tục của hành động từ quá khứ đến hiện tại.</p>
      <p>2. Hành động vừa dừng nhưng để lại kết quả.</p>
      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">I <strong>have been studying</strong> English for 3 hours.</div>
        <div class="en-ex-vi">→ Tôi đã học tiếng Anh được 3 tiếng (vẫn đang học).</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">She is tired because she <strong>has been running</strong>.</div>
        <div class="en-ex-vi">→ Cô ấy mệt vì cô ấy đã chạy (vừa dừng).</div>
      </div>
      <h4>⏰ Dấu hiệu nhận biết</h4>
      <p><strong>for, since, all day, all morning, how long, lately, recently...</strong></p>
    `,
    exercises: [
      { q: 'She ___ (wait) for the bus for 30 minutes.', options: ['has been waiting', 'waited', 'is waiting', 'waits'], correct: 0, explain: '"for 30 minutes" + nhấn mạnh liên tục → has been waiting' },
      { q: 'I ___ (work) on this project since Monday.', options: ['have been working', 'worked', 'am working', 'work'], correct: 0, explain: '"since Monday" + hành động vẫn tiếp tục → have been working' },
      { q: 'How long ___ you ___ (learn) Vietnamese?', options: ['have / been learning', 'did / learn', 'are / learning', 'do / learn'], correct: 0, explain: '"How long" hỏi thời gian kéo dài → have you been learning' },
      { q: 'It ___ (rain) all day. The streets are wet.', options: ['has been raining', 'rained', 'rains', 'is raining'], correct: 0, explain: '"all day" + kết quả (streets are wet) → has been raining' },
      { q: 'They ___ (play) football since 2 PM.', options: ['have been playing', 'played', 'are playing', 'play'], correct: 0, explain: '"since 2 PM" + hành động vẫn tiếp diễn → have been playing' },
    ]
  },
  {
    id: 'past_simple',
    title: 'Thì Quá Khứ Đơn',
    subtitle: 'Simple Past',
    icon: '🟤',
    color: 'purple',
    badge: 'past',
    content: `
      <h4>📌 Công thức</h4>
      <div class="en-formula">
        <strong>(+)</strong> S + <code>V2</code> (past form) + O<br>
        <strong>(-)</strong> S + <code>did not</code> + V (nguyên thể) + O<br>
        <strong>(?)</strong> <code>Did</code> + S + V (nguyên thể) + O?
      </div>
      <h4>🎯 Cách dùng</h4>
      <p>1. Hành động đã hoàn tất trong quá khứ tại thời điểm xác định.</p>
      <p>2. Một loạt hành động liên tiếp trong quá khứ.</p>
      <p>3. Thói quen trong quá khứ (không còn ở hiện tại).</p>
      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">I <strong>went</strong> to the cinema last night.</div>
        <div class="en-ex-vi">→ Tôi đã đi xem phim tối qua.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">She <strong>woke up</strong>, <strong>brushed</strong> her teeth, and <strong>had</strong> breakfast.</div>
        <div class="en-ex-vi">→ Cô ấy thức dậy, đánh răng, và ăn sáng.</div>
      </div>
      <h4>⏰ Dấu hiệu nhận biết</h4>
      <p><strong>yesterday, last (week/month/year), ago, in 2010, when I was young...</strong></p>
      <div class="en-note">⚠️ <strong>Lưu ý:</strong> Động từ bất quy tắc (irregular verbs) cần học thuộc: go→went, see→saw, eat→ate, take→took, buy→bought...</div>
    `,
    exercises: [
      { q: 'She ___ (visit) her grandmother last weekend.', options: ['visited', 'visits', 'has visited', 'is visiting'], correct: 0, explain: '"last weekend" → quá khứ đơn: visited' },
      { q: 'They ___ (not/go) to school yesterday.', options: ['didn\'t go', 'don\'t go', 'weren\'t go', 'haven\'t gone'], correct: 0, explain: '"yesterday" → quá khứ đơn phủ định: didn\'t go' },
      { q: '___ you ___ (see) the movie last night?', options: ['Did / see', 'Have / seen', 'Do / see', 'Were / seeing'], correct: 0, explain: '"last night" → quá khứ đơn: Did you see...?' },
      { q: 'He ___ (buy) a new car two months ago.', options: ['bought', 'buys', 'has bought', 'is buying'], correct: 0, explain: '"two months ago" → quá khứ đơn: bought (bất quy tắc)' },
      { q: 'When I was young, I ___ (play) football every day.', options: ['played', 'play', 'have played', 'was playing'], correct: 0, explain: '"When I was young" → thói quen quá khứ → played' },
      { q: 'She ___ (wake) up, ___ (get) dressed, and ___ (leave).', options: ['woke / got / left', 'wakes / gets / leaves', 'woke / get / left', 'woken / gotten / left'], correct: 0, explain: 'Chuỗi hành động quá khứ → dùng V2: woke, got, left' },
    ]
  },
  {
    id: 'past_continuous',
    title: 'Thì Quá Khứ Tiếp Diễn',
    subtitle: 'Past Continuous',
    icon: '🟡',
    color: 'orange',
    badge: 'past',
    content: `
      <h4>📌 Công thức</h4>
      <div class="en-formula">
        <strong>(+)</strong> S + <code>was/were</code> + V-<code>ing</code> + O<br>
        <strong>(-)</strong> S + <code>was/were + not</code> + V-ing + O<br>
        <strong>(?)</strong> <code>Was/Were</code> + S + V-ing + O?
      </div>
      <h4>🎯 Cách dùng</h4>
      <p>1. Hành động đang diễn ra tại một thời điểm xác định trong quá khứ.</p>
      <p>2. Hành động đang xảy ra thì bị gián đoạn bởi hành động khác.</p>
      <p>3. Hai hành động song song diễn ra cùng lúc trong quá khứ.</p>
      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">I <strong>was studying</strong> when she <strong>called</strong>.</div>
        <div class="en-ex-vi">→ Tôi đang học thì cô ấy gọi điện.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">While I <strong>was cooking</strong>, he <strong>was cleaning</strong>.</div>
        <div class="en-ex-vi">→ Trong khi tôi nấu ăn, anh ấy dọn dẹp.</div>
      </div>
      <h4>⏰ Dấu hiệu nhận biết</h4>
      <p><strong>while, when, at that time, at 8 PM last night, as...</strong></p>
      <div class="en-note">⚠️ <strong>Công thức quan trọng:</strong> When + quá khứ đơn, quá khứ tiếp diễn. While + quá khứ tiếp diễn, quá khứ đơn.</div>
    `,
    exercises: [
      { q: 'I ___ (study) when she called me.', options: ['was studying', 'studied', 'am studying', 'have studied'], correct: 0, explain: 'Hành động đang diễn ra bị gián đoạn → was studying' },
      { q: 'While she ___ (cook), he ___ (watch) TV.', options: ['was cooking / was watching', 'cooked / watched', 'is cooking / is watching', 'cooks / watches'], correct: 0, explain: 'Hai hành động song song trong quá khứ → was cooking / was watching' },
      { q: 'At 9 PM last night, they ___ (have) dinner.', options: ['were having', 'had', 'have', 'are having'], correct: 0, explain: '"At 9 PM last night" → hành động đang diễn ra → were having' },
      { q: 'The phone ___ (ring) while I ___ (take) a shower.', options: ['rang / was taking', 'was ringing / took', 'rang / took', 'rings / takes'], correct: 0, explain: 'Hành động ngắn (rang) gián đoạn hành động dài (was taking)' },
      { q: 'What ___ you ___ (do) at 3 PM yesterday?', options: ['were / doing', 'did / do', 'are / doing', 'have / done'], correct: 0, explain: '"at 3 PM yesterday" → thời điểm cụ thể → were you doing' },
    ]
  },
  {
    id: 'past_perfect',
    title: 'Thì Quá Khứ Hoàn Thành',
    subtitle: 'Past Perfect',
    icon: '⬛',
    color: 'accent',
    badge: 'past',
    content: `
      <h4>📌 Công thức</h4>
      <div class="en-formula">
        <strong>(+)</strong> S + <code>had</code> + V<code>3</code> (past participle) + O<br>
        <strong>(-)</strong> S + <code>had not</code> + V3 + O<br>
        <strong>(?)</strong> <code>Had</code> + S + V3 + O?
      </div>
      <h4>🎯 Cách dùng</h4>
      <p>1. Hành động xảy ra trước một hành động khác trong quá khứ.</p>
      <p>2. Hành động xảy ra trước một thời điểm trong quá khứ.</p>
      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">When I arrived, the train <strong>had already left</strong>.</div>
        <div class="en-ex-vi">→ Khi tôi đến, tàu đã rời đi rồi.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">She <strong>had finished</strong> dinner before he came home.</div>
        <div class="en-ex-vi">→ Cô ấy đã ăn tối xong trước khi anh ấy về nhà.</div>
      </div>
      <h4>⏰ Dấu hiệu nhận biết</h4>
      <p><strong>before, after, when, by the time, already, just, never...before, until...</strong></p>
      <div class="en-note">⚠️ <strong>Quy tắc:</strong> Hành động xảy ra <strong>trước</strong> → quá khứ hoàn thành. Hành động xảy ra <strong>sau</strong> → quá khứ đơn.</div>
    `,
    exercises: [
      { q: 'When I arrived, the movie ___ (already/start).', options: ['had already started', 'already started', 'has already started', 'was already starting'], correct: 0, explain: 'Hành động xảy ra trước "arrived" → had already started' },
      { q: 'She ___ (finish) her work before she went out.', options: ['had finished', 'finished', 'has finished', 'was finishing'], correct: 0, explain: '"before she went out" → xảy ra trước → had finished' },
      { q: 'By the time he called, I ___ (leave) the office.', options: ['had left', 'left', 'have left', 'was leaving'], correct: 0, explain: '"By the time" → hành động trước → had left' },
      { q: 'After they ___ (eat), they went for a walk.', options: ['had eaten', 'ate', 'have eaten', 'were eating'], correct: 0, explain: '"After" + hành động trước → had eaten' },
      { q: 'I ___ (never/see) snow before I visited Canada.', options: ['had never seen', 'never saw', 'have never seen', 'never see'], correct: 0, explain: 'Kinh nghiệm trước mốc quá khứ → had never seen' },
    ]
  },
  {
    id: 'future_simple',
    title: 'Thì Tương Lai Đơn',
    subtitle: 'Simple Future (will)',
    icon: '🔶',
    color: 'orange',
    badge: 'future',
    content: `
      <h4>📌 Công thức</h4>
      <div class="en-formula">
        <strong>(+)</strong> S + <code>will</code> + V (nguyên thể) + O<br>
        <strong>(-)</strong> S + <code>will not (won't)</code> + V + O<br>
        <strong>(?)</strong> <code>Will</code> + S + V + O?
      </div>
      <h4>🎯 Cách dùng</h4>
      <p>1. Quyết định tại thời điểm nói (spontaneous decision).</p>
      <p>2. Dự đoán về tương lai (prediction).</p>
      <p>3. Lời hứa, đề nghị, yêu cầu.</p>
      <p>4. Dự đoán dựa trên ý kiến (I think, I believe...).</p>
      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">I <strong>will help</strong> you with your homework.</div>
        <div class="en-ex-vi">→ Tôi sẽ giúp bạn làm bài tập. (đề nghị)</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">I think it <strong>will rain</strong> tomorrow.</div>
        <div class="en-ex-vi">→ Tôi nghĩ ngày mai sẽ mưa. (dự đoán)</div>
      </div>
      <h4>⏰ Dấu hiệu nhận biết</h4>
      <p><strong>tomorrow, next (week/month/year), in the future, I think, I believe, probably, perhaps, soon...</strong></p>
      <div class="en-note">⚠️ <strong>Will vs Be going to:</strong> <code>will</code> dùng khi quyết định ngay. <code>be going to</code> dùng khi đã lên kế hoạch hoặc có dấu hiệu rõ ràng.</div>
    `,
    exercises: [
      { q: 'I think she ___ (pass) the exam.', options: ['will pass', 'is going to pass', 'passes', 'passed'], correct: 0, explain: '"I think" + dự đoán → will pass' },
      { q: '"The phone is ringing." "I ___ (get) it."', options: ['will get', 'am going to get', 'get', 'am getting'], correct: 0, explain: 'Quyết định ngay tại thời điểm nói → will get' },
      { q: 'Don\'t worry. I ___ (not/tell) anyone your secret.', options: ['won\'t tell', 'don\'t tell', 'am not telling', 'haven\'t told'], correct: 0, explain: 'Lời hứa → won\'t tell' },
      { q: '___ you ___ (help) me carry these boxes?', options: ['Will / help', 'Do / help', 'Are / helping', 'Did / help'], correct: 0, explain: 'Yêu cầu lịch sự → Will you help...?' },
      { q: 'He probably ___ (arrive) late tonight.', options: ['will arrive', 'arrives', 'is arriving', 'arrived'], correct: 0, explain: '"probably" + dự đoán → will arrive' },
      { q: 'I promise I ___ (call) you when I get there.', options: ['will call', 'call', 'am calling', 'called'], correct: 0, explain: 'Lời hứa "I promise" → will call' },
    ]
  },
  {
    id: 'future_continuous',
    title: 'Thì Tương Lai Tiếp Diễn',
    subtitle: 'Future Continuous',
    icon: '🔸',
    color: 'orange',
    badge: 'future',
    content: `
      <h4>📌 Công thức</h4>
      <div class="en-formula">
        <strong>(+)</strong> S + <code>will be</code> + V-<code>ing</code> + O<br>
        <strong>(-)</strong> S + <code>will not be</code> + V-ing + O<br>
        <strong>(?)</strong> <code>Will</code> + S + <code>be</code> + V-ing + O?
      </div>
      <h4>🎯 Cách dùng</h4>
      <p>1. Hành động sẽ đang diễn ra tại một thời điểm trong tương lai.</p>
      <p>2. Hành động được dự kiến sẽ xảy ra theo kế hoạch.</p>
      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">At 8 PM tonight, I <strong>will be watching</strong> a movie.</div>
        <div class="en-ex-vi">→ Lúc 8 giờ tối nay, tôi sẽ đang xem phim.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">This time next week, she <strong>will be traveling</strong> in Japan.</div>
        <div class="en-ex-vi">→ Giờ này tuần sau, cô ấy sẽ đang du lịch ở Nhật.</div>
      </div>
      <h4>⏰ Dấu hiệu nhận biết</h4>
      <p><strong>at this time tomorrow, at + giờ + tương lai, this time next week...</strong></p>
    `,
    exercises: [
      { q: 'At 10 PM tonight, I ___ (sleep).', options: ['will be sleeping', 'will sleep', 'sleep', 'am sleeping'], correct: 0, explain: '"At 10 PM tonight" → thời điểm cụ thể tương lai → will be sleeping' },
      { q: 'This time tomorrow, we ___ (fly) to Paris.', options: ['will be flying', 'will fly', 'fly', 'are flying'], correct: 0, explain: '"This time tomorrow" → sẽ đang diễn ra → will be flying' },
      { q: 'Don\'t call me at 3 PM. I ___ (have) a meeting.', options: ['will be having', 'will have', 'have', 'am having'], correct: 0, explain: 'Thời điểm cụ thể tương lai → will be having' },
      { q: 'She ___ (work) at the office when you arrive.', options: ['will be working', 'will work', 'works', 'worked'], correct: 0, explain: 'Hành động sẽ đang diễn ra khi sự kiện khác xảy ra → will be working' },
    ]
  },
  {
    id: 'future_perfect',
    title: 'Thì Tương Lai Hoàn Thành',
    subtitle: 'Future Perfect',
    icon: '💎',
    color: 'accent',
    badge: 'future',
    content: `
      <h4>📌 Công thức</h4>
      <div class="en-formula">
        <strong>(+)</strong> S + <code>will have</code> + V<code>3</code> (past participle) + O<br>
        <strong>(-)</strong> S + <code>will not have</code> + V3 + O<br>
        <strong>(?)</strong> <code>Will</code> + S + <code>have</code> + V3 + O?
      </div>
      <h4>🎯 Cách dùng</h4>
      <p>1. Hành động sẽ hoàn tất trước một thời điểm trong tương lai.</p>
      <p>2. Hành động sẽ hoàn tất trước một hành động khác trong tương lai.</p>
      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">By next year, I <strong>will have graduated</strong> from university.</div>
        <div class="en-ex-vi">→ Đến năm sau, tôi sẽ đã tốt nghiệp đại học.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">She <strong>will have finished</strong> the report by 5 PM.</div>
        <div class="en-ex-vi">→ Cô ấy sẽ hoàn thành báo cáo trước 5 giờ chiều.</div>
      </div>
      <h4>⏰ Dấu hiệu nhận biết</h4>
      <p><strong>by + thời gian tương lai, by the time, before + mệnh đề tương lai...</strong></p>
    `,
    exercises: [
      { q: 'By next month, I ___ (finish) this course.', options: ['will have finished', 'will finish', 'finish', 'have finished'], correct: 0, explain: '"By next month" → hoàn thành trước mốc → will have finished' },
      { q: 'She ___ (leave) by the time you get here.', options: ['will have left', 'will leave', 'leaves', 'has left'], correct: 0, explain: '"by the time" → hoàn thành trước → will have left' },
      { q: 'By 2030, they ___ (build) the new airport.', options: ['will have built', 'will build', 'build', 'have built'], correct: 0, explain: '"By 2030" → hoàn thành trước mốc → will have built' },
      { q: 'I ___ (read) 50 books by the end of this year.', options: ['will have read', 'will read', 'read', 'have read'], correct: 0, explain: '"by the end of this year" → will have read' },
    ]
  },
  {
    id: 'conditionals',
    title: 'Câu Điều Kiện',
    subtitle: 'Conditionals (Type 0, 1, 2, 3)',
    icon: '🔀',
    color: 'green',
    badge: 'other',
    content: `
      <h4>📌 Type 0 — Sự thật hiển nhiên</h4>
      <div class="en-formula">If + S + <code>V (hiện tại đơn)</code>, S + <code>V (hiện tại đơn)</code></div>
      <div class="en-example"><div class="en-ex-en">If you heat water to 100°C, it <strong>boils</strong>.</div></div>

      <h4>📌 Type 1 — Có thể xảy ra (tương lai)</h4>
      <div class="en-formula">If + S + <code>V (hiện tại đơn)</code>, S + <code>will + V</code></div>
      <div class="en-example"><div class="en-ex-en">If it <strong>rains</strong>, I <strong>will stay</strong> home.</div><div class="en-ex-vi">→ Nếu trời mưa, tôi sẽ ở nhà.</div></div>

      <h4>📌 Type 2 — Không có thật ở hiện tại (giả định)</h4>
      <div class="en-formula">If + S + <code>V2 (quá khứ đơn)</code>, S + <code>would + V</code></div>
      <div class="en-example"><div class="en-ex-en">If I <strong>were</strong> rich, I <strong>would travel</strong> the world.</div><div class="en-ex-vi">→ Nếu tôi giàu, tôi sẽ đi du lịch vòng quanh thế giới. (thực tế tôi không giàu)</div></div>

      <h4>📌 Type 3 — Không có thật trong quá khứ</h4>
      <div class="en-formula">If + S + <code>had + V3</code>, S + <code>would have + V3</code></div>
      <div class="en-example"><div class="en-ex-en">If I <strong>had studied</strong> harder, I <strong>would have passed</strong> the exam.</div><div class="en-ex-vi">→ Nếu tôi học chăm hơn, tôi đã đậu rồi. (thực tế tôi không học chăm)</div></div>

      <div class="en-note">⚠️ <strong>Lưu ý:</strong> Type 2: luôn dùng <code>were</code> cho tất cả chủ ngữ (If I <em>were</em>..., If she <em>were</em>...)</div>
    `,
    exercises: [
      { q: 'If it ___ (rain) tomorrow, I will stay home.', options: ['rains', 'will rain', 'rained', 'would rain'], correct: 0, explain: 'Câu ĐK loại 1: If + hiện tại đơn → rains' },
      { q: 'If I ___ (be) you, I would apologize.', options: ['were', 'am', 'was', 'will be'], correct: 0, explain: 'Câu ĐK loại 2: dùng "were" cho tất cả ngôi' },
      { q: 'If she had studied harder, she ___ (pass) the exam.', options: ['would have passed', 'would pass', 'will pass', 'passed'], correct: 0, explain: 'Câu ĐK loại 3: would have + V3' },
      { q: 'If you heat ice, it ___ (melt).', options: ['melts', 'will melt', 'melted', 'would melt'], correct: 0, explain: 'Câu ĐK loại 0: sự thật → hiện tại đơn cả hai vế' },
      { q: 'If I ___ (have) more money, I would buy a bigger house.', options: ['had', 'have', 'will have', 'had had'], correct: 0, explain: 'Câu ĐK loại 2: If + V2 (quá khứ đơn) → had' },
      { q: 'If he ___ (not/miss) the bus, he wouldn\'t have been late.', options: ['hadn\'t missed', 'didn\'t miss', 'doesn\'t miss', 'won\'t miss'], correct: 0, explain: 'Câu ĐK loại 3: If + had + V3 → hadn\'t missed' },
    ]
  },
  {
    id: 'passive_voice',
    title: 'Câu Bị Động',
    subtitle: 'Passive Voice',
    icon: '🔄',
    color: 'blue',
    badge: 'other',
    content: `
      <h4>📌 Công thức chung</h4>
      <div class="en-formula">S + <code>be</code> (chia theo thì) + V<code>3</code> (past participle) + (by + tác nhân)</div>

      <h4>📌 Bảng chuyển đổi theo thì</h4>
      <table>
        <tr><th>Thì</th><th>Chủ động</th><th>Bị động</th></tr>
        <tr><td>Hiện tại đơn</td><td>S + V(s/es)</td><td>S + <strong>am/is/are</strong> + V3</td></tr>
        <tr><td>Hiện tại tiếp diễn</td><td>S + am/is/are + V-ing</td><td>S + <strong>am/is/are being</strong> + V3</td></tr>
        <tr><td>Quá khứ đơn</td><td>S + V2</td><td>S + <strong>was/were</strong> + V3</td></tr>
        <tr><td>Hiện tại hoàn thành</td><td>S + have/has + V3</td><td>S + <strong>have/has been</strong> + V3</td></tr>
        <tr><td>Tương lai đơn</td><td>S + will + V</td><td>S + <strong>will be</strong> + V3</td></tr>
        <tr><td>Modal verbs</td><td>S + can/must/... + V</td><td>S + <strong>can/must/... be</strong> + V3</td></tr>
      </table>

      <h4>📝 Ví dụ</h4>
      <div class="en-example">
        <div class="en-ex-en">This cake <strong>was made</strong> by my mother.</div>
        <div class="en-ex-vi">→ Chiếc bánh này được làm bởi mẹ tôi.</div>
      </div>
      <div class="en-example">
        <div class="en-ex-en">English <strong>is spoken</strong> all over the world.</div>
        <div class="en-ex-vi">→ Tiếng Anh được nói trên toàn thế giới.</div>
      </div>
    `,
    exercises: [
      { q: 'English ___ (speak) in many countries.', options: ['is spoken', 'speaks', 'is speaking', 'spoke'], correct: 0, explain: 'Bị động hiện tại đơn: is + V3 → is spoken' },
      { q: 'The project ___ (complete) yesterday.', options: ['was completed', 'completed', 'is completed', 'has completed'], correct: 0, explain: '"yesterday" → bị động quá khứ đơn: was completed' },
      { q: 'A new school ___ (build) next year.', options: ['will be built', 'will build', 'is built', 'was built'], correct: 0, explain: '"next year" → bị động tương lai: will be built' },
      { q: 'The report ___ (already/submit).', options: ['has already been submitted', 'already submitted', 'is already submitted', 'was already submitted'], correct: 0, explain: '"already" → bị động HTHT: has already been submitted' },
      { q: 'The house ___ (paint) right now.', options: ['is being painted', 'is painted', 'was painted', 'paints'], correct: 0, explain: '"right now" → bị động hiện tại tiếp diễn: is being painted' },
    ]
  }
];

// ===== STATE =====
let currentTab = 'grammar';
let progressData = {};
let vocabList = [];
let quizState = null; // { lessonId, questions, currentQ, answers, submitted }
let editingVocabId = null;

// ===== DOM =====
const $ = id => document.getElementById(id);

// ===== INIT =====
async function initApp() {
  setupTheme();
  setupDate();
  setupTabs();
  await loadProgress();
  renderLessons();
  renderExerciseList();
  await loadVocab();
  setupVocabEvents();
  loadWordOfDay();
  loadStreak();
}

// Theme is handled by global-utils.js
function setupTheme() { /* handled by global-utils.js */ }

function setupDate() {
  const el = $('nav-date');
  if (el) {
    const d = new Date();
    el.textContent = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }
}

// ===== TABS =====
function setupTabs() {
  document.querySelectorAll('.en-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.en-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.en-tab-content').forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      $(`tab-${target}`)?.classList.add('active');
      currentTab = target;
    });
  });
}

// ===== PROGRESS =====
async function loadProgress() {
  try {
    const res = await fetch('/api/english/progress');
    const data = await res.json();
    progressData = {};
    data.forEach(p => { progressData[p.lessonId] = p; });
    updateStats();
  } catch (e) { console.error('Load progress error:', e); }
}

function updateStats() {
  const lessons = Object.keys(progressData).length;
  $('stat-lessons').textContent = lessons;
  $('stat-vocab').textContent = vocabList.length;
  if (lessons > 0) {
    const avg = Math.round(
      Object.values(progressData).reduce((s, p) => s + (p.bestScore / p.totalQ) * 100, 0) / lessons
    );
    $('stat-score').textContent = avg + '%';
  } else {
    $('stat-score').textContent = '0%';
  }
}

// ===== RENDER LESSONS =====
function renderLessons() {
  const grid = $('lessons-grid');
  grid.innerHTML = LESSONS.map(lesson => {
    const prog = progressData[lesson.id];
    const pct = prog ? Math.round((prog.bestScore / prog.totalQ) * 100) : 0;
    return `
      <div class="en-lesson-card" data-color="${lesson.color}" data-id="${lesson.id}">
        <div class="en-lesson-icon">${lesson.icon}</div>
        <div class="en-lesson-title">${lesson.title}</div>
        <div class="en-lesson-subtitle">${lesson.subtitle}</div>
        <div class="en-lesson-meta">
          <span class="en-lesson-badge en-badge-${lesson.badge}">${lesson.badge}</span>
          <div class="en-lesson-progress">
            ${prog ? `${pct}%` : 'Chưa học'}
            <div class="en-lesson-progress-bar"><div class="en-lesson-progress-fill" style="width:${pct}%"></div></div>
          </div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.en-lesson-card').forEach(card => {
    card.addEventListener('click', () => openLesson(card.dataset.id));
  });
}

function openLesson(id) {
  const lesson = LESSONS.find(l => l.id === id);
  if (!lesson) return;
  $('lesson-modal-title').textContent = `${lesson.icon} ${lesson.title} — ${lesson.subtitle}`;
  $('lesson-modal-body').innerHTML = `<div class="en-lesson-content">${lesson.content}</div>`;
  $('lesson-modal').style.display = '';
  $('lesson-modal-close').onclick = () => $('lesson-modal').style.display = 'none';
  $('lesson-modal').onclick = e => { if (e.target === $('lesson-modal')) $('lesson-modal').style.display = 'none'; };
}

// ===== RENDER EXERCISE LIST =====
function renderExerciseList() {
  const list = $('exercise-list');
  list.innerHTML = LESSONS.map(lesson => {
    const prog = progressData[lesson.id];
    const scoreText = prog ? `Best: ${Math.round((prog.bestScore / prog.totalQ) * 100)}% (${prog.attempts} lần)` : '';
    return `
      <div class="en-exercise-item" data-id="${lesson.id}">
        <div class="en-exercise-icon">${lesson.icon}</div>
        <div class="en-exercise-info">
          <div class="en-exercise-name">${lesson.title}</div>
          <div class="en-exercise-desc">${lesson.exercises.length} câu hỏi mẫu</div>
        </div>
        <div class="en-exercise-actions">
          ${scoreText ? `<div class="en-exercise-score">${scoreText}</div>` : ''}
          <button class="en-btn en-btn-sm en-btn-secondary en-btn-practice" data-id="${lesson.id}" title="Làm bài tập mẫu">📝 Bài mẫu</button>
          <button class="en-btn en-btn-sm en-btn-ai-quiz" data-id="${lesson.id}" title="AI tạo bài tập mới">🤖 AI tạo đề</button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.en-btn-practice').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      startQuiz(btn.dataset.id);
    });
  });

  list.querySelectorAll('.en-btn-ai-quiz').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAIQuizConfig(btn.dataset.id);
    });
  });
}

// ===== AI QUIZ GENERATION =====
let aiQuizLoading = false;

function openAIQuizConfig(lessonId) {
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) return;

  // Show config in quiz modal
  $('quiz-modal-title').textContent = `🤖 AI — ${lesson.title}`;
  $('quiz-btn-prev').style.display = 'none';
  $('quiz-btn-next').style.display = 'none';
  $('quiz-modal-body').innerHTML = `
    <div class="en-ai-quiz-config">
      <div class="en-ai-quiz-header">
        <div class="en-ai-quiz-icon">🤖</div>
        <h3>AI tạo bài tập mới</h3>
        <p>AI sẽ tạo câu hỏi mới hoàn toàn cho chủ đề <strong>${lesson.title}</strong></p>
      </div>
      <div class="en-ai-quiz-options">
        <div class="en-form-group">
          <label>Số câu hỏi</label>
          <div class="en-ai-count-group">
            <button class="en-ai-count-btn ${aiQuizCount === 5 ? 'active' : ''}" data-count="5">5</button>
            <button class="en-ai-count-btn ${aiQuizCount === 8 ? 'active' : ''}" data-count="8">8</button>
            <button class="en-ai-count-btn ${aiQuizCount === 10 ? 'active' : ''}" data-count="10">10</button>
          </div>
        </div>
        <div class="en-form-group">
          <label>Độ khó</label>
          <div class="en-ai-diff-group">
            <button class="en-ai-diff-btn ${aiQuizDifficulty === 'easy' ? 'active' : ''}" data-diff="easy">
              <span class="en-ai-diff-emoji">🟢</span> Dễ
            </button>
            <button class="en-ai-diff-btn ${aiQuizDifficulty === 'medium' ? 'active' : ''}" data-diff="medium">
              <span class="en-ai-diff-emoji">🟡</span> Trung bình
            </button>
            <button class="en-ai-diff-btn ${aiQuizDifficulty === 'hard' ? 'active' : ''}" data-diff="hard">
              <span class="en-ai-diff-emoji">🔴</span> Khó
            </button>
          </div>
        </div>
      </div>
      <button class="en-btn en-btn-primary en-btn-ai-generate" id="btn-ai-generate" data-id="${lessonId}">
        🤖 Tạo bài tập ngay
      </button>
    </div>`;

  $('quiz-modal').style.display = '';

  // Count & difficulty selection
  $('quiz-modal-body').querySelectorAll('.en-ai-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('quiz-modal-body').querySelectorAll('.en-ai-count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aiQuizCount = parseInt(btn.dataset.count);
    });
  });

  $('quiz-modal-body').querySelectorAll('.en-ai-diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('quiz-modal-body').querySelectorAll('.en-ai-diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aiQuizDifficulty = btn.dataset.diff;
    });
  });

  $('btn-ai-generate').addEventListener('click', () => startAIQuiz(lessonId));

  $('quiz-modal-close').onclick = () => $('quiz-modal').style.display = 'none';
  $('quiz-modal').onclick = e => { if (e.target === $('quiz-modal')) $('quiz-modal').style.display = 'none'; };
}

let aiQuizCount = 5;
let aiQuizDifficulty = 'medium';

async function startAIQuiz(lessonId) {
  if (aiQuizLoading) return;
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) return;

  aiQuizLoading = true;
  const genBtn = $('btn-ai-generate');
  if (genBtn) {
    genBtn.disabled = true;
    genBtn.innerHTML = `<span class="en-ai-spinner"></span> Đang tạo bài tập...`;
  }

  try {
    const res = await fetch('/api/english/ai-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: lesson.id,
        lessonTitle: `${lesson.title} (${lesson.subtitle})`,
        count: aiQuizCount,
        difficulty: aiQuizDifficulty
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Lỗi tạo bài tập');
    }

    const data = await res.json();

    if (!data.exercises || !data.exercises.length) {
      throw new Error('AI không tạo được bài tập');
    }

    // Start quiz with AI-generated exercises
    const shuffled = [...data.exercises].sort(() => Math.random() - 0.5);

    quizState = {
      lessonId,
      lesson,
      questions: shuffled,
      currentQ: 0,
      answers: new Array(shuffled.length).fill(-1),
      submitted: new Array(shuffled.length).fill(false),
      score: 0,
      finished: false,
      isAI: true,
      difficulty: aiQuizDifficulty
    };

    $('quiz-modal-title').textContent = `🤖 AI — ${lesson.title}`;
    $('quiz-btn-next').style.display = '';
    renderQuizQuestion();
    setupQuizNav();

  } catch (e) {
    console.error('AI quiz error:', e);
    $('quiz-modal-body').innerHTML = `
      <div class="en-ai-quiz-error">
        <div class="en-ai-quiz-error-icon">😵</div>
        <h3>Không thể tạo bài tập</h3>
        <p>${escapeHtml(e.message)}</p>
        <div class="en-quiz-result-actions">
          <button class="en-btn en-btn-secondary" id="ai-quiz-retry">🔄 Thử lại</button>
          <button class="en-btn en-btn-primary" id="ai-quiz-close">Đóng</button>
        </div>
      </div>`;
    $('ai-quiz-retry')?.addEventListener('click', () => openAIQuizConfig(lessonId));
    $('ai-quiz-close')?.addEventListener('click', () => { $('quiz-modal').style.display = 'none'; });
  } finally {
    aiQuizLoading = false;
  }
}

// ===== QUIZ =====
function startQuiz(lessonId) {
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson || !lesson.exercises.length) return;

  // Shuffle exercises
  const shuffled = [...lesson.exercises].sort(() => Math.random() - 0.5);

  quizState = {
    lessonId,
    lesson,
    questions: shuffled,
    currentQ: 0,
    answers: new Array(shuffled.length).fill(-1),
    submitted: new Array(shuffled.length).fill(false),
    score: 0,
    finished: false
  };

  $('quiz-modal-title').textContent = `🎯 ${lesson.title}`;
  $('quiz-modal').style.display = '';
  renderQuizQuestion();
  setupQuizNav();
}

function renderQuizQuestion() {
  if (!quizState) return;
  const { questions, currentQ, answers, submitted, finished, isAI } = quizState;

  if (finished) {
    renderQuizResult();
    return;
  }

  const q = questions[currentQ];
  const total = questions.length;

  $('quiz-progress-text').textContent = `${currentQ + 1}/${total}`;
  $('quiz-bar-fill').style.width = `${((currentQ + 1) / total) * 100}%`;

  const isSubmitted = submitted[currentQ];
  const selected = answers[currentQ];

  let optionsHtml = q.options.map((opt, i) => {
    let cls = 'en-quiz-option';
    if (isSubmitted) {
      cls += ' disabled';
      if (i === q.correct) cls += ' correct';
      else if (i === selected && i !== q.correct) cls += ' wrong';
    } else if (i === selected) {
      cls += ' selected';
    }
    return `<button class="${cls}" data-idx="${i}">${opt}</button>`;
  }).join('');

  let explainHtml = '';
  if (isSubmitted) {
    explainHtml = `<div class="en-quiz-explanation">💡 ${q.explain}</div>`;
  }

  $('quiz-modal-body').innerHTML = `
    <div class="en-quiz-question">
      ${isAI ? '<div class="en-ai-quiz-indicator">🤖 AI</div>' : ''}
      <div class="en-quiz-q-text">${formatQuizText(q.q)}</div>
      <div class="en-quiz-options">${optionsHtml}</div>
      ${explainHtml}
    </div>`;

  // Option click handlers
  if (!isSubmitted) {
    $('quiz-modal-body').querySelectorAll('.en-quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        quizState.answers[currentQ] = idx;
        quizState.submitted[currentQ] = true;
        if (idx === q.correct) quizState.score++;
        renderQuizQuestion();
      });
    });
  }

  // Update nav buttons
  $('quiz-btn-prev').style.display = currentQ > 0 ? '' : 'none';

  if (currentQ === total - 1 && isSubmitted) {
    $('quiz-btn-next').textContent = '📊 Kết quả';
  } else if (isSubmitted) {
    $('quiz-btn-next').textContent = 'Tiếp →';
  } else {
    $('quiz-btn-next').textContent = 'Bỏ qua →';
  }
}

function formatQuizText(text) {
  return text.replace(/___/g, '<span class="en-blank">___</span>');
}

function renderQuizResult() {
  const { score, questions, lessonId, lesson, isAI, difficulty, answers, submitted } = quizState;
  const total = questions.length;
  const pct = Math.round((score / total) * 100);
  let scoreClass = '';
  let emoji = '🎉';
  let msg = 'Xuất sắc! Bạn nắm vững kiến thức rồi!';

  if (pct < 50) { scoreClass = 'low'; emoji = '😅'; msg = 'Cần ôn tập thêm. Đừng bỏ cuộc!'; }
  else if (pct < 80) { scoreClass = 'mid'; emoji = '👍'; msg = 'Khá tốt! Ôn thêm chút nữa nhé!'; }

  const aiLabel = isAI ? `<div class="en-ai-quiz-badge">🤖 Đề AI${difficulty ? ` — ${difficulty === 'easy' ? 'Dễ' : difficulty === 'hard' ? 'Khó' : 'TB'}` : ''}</div>` : '';

  $('quiz-modal-body').innerHTML = `
    <div class="en-quiz-result">
      <div class="en-quiz-result-icon">${emoji}</div>
      <h3>${lesson.title}</h3>
      ${aiLabel}
      <div class="en-quiz-score-big ${scoreClass}">${pct}%</div>
      <p>Đúng ${score}/${total} câu — ${msg}</p>
      <div class="en-quiz-result-actions">
        <button class="en-btn en-btn-secondary" id="quiz-retry">🔄 Làm lại</button>
        <button class="en-btn en-btn-ai-result" id="quiz-ai-new">🤖 AI đề mới</button>
        <button class="en-btn en-btn-primary" id="quiz-close-result">✅ Hoàn tất</button>
      </div>
      <div class="quiz-ai-grade" id="quiz-ai-grade"></div>
    </div>`;

  $('quiz-btn-prev').style.display = 'none';
  $('quiz-btn-next').style.display = 'none';

  $('quiz-retry')?.addEventListener('click', () => {
    $('quiz-btn-next').style.display = '';
    if (quizState?.isAI) {
      startAIQuiz(lessonId);
    } else {
      startQuiz(lessonId);
    }
  });
  $('quiz-ai-new')?.addEventListener('click', () => {
    openAIQuizConfig(lessonId);
  });
  $('quiz-close-result')?.addEventListener('click', () => {
    $('quiz-modal').style.display = 'none';
  });

  // Save progress
  saveQuizProgress(lessonId, score, total);

  // AI grading — auto-trigger
  aiGradeGrammarQuiz();
}

async function aiGradeGrammarQuiz() {
  if (!quizState) return;
  const { questions, answers } = quizState;
  const gradeEl = $('quiz-ai-grade');
  if (!gradeEl) return;

  gradeEl.innerHTML = `<div class="rex-grading-loading"><div class="rex-grading-spinner"></div> 🤖 AI đang phân tích bài làm...</div>`;

  // Build exercises + userAnswers for the grade API
  const exercises = questions.map((q, i) => ({
    type: 'multiple_choice',
    question: q.q,
    options: q.options,
    answer: q.options[q.correct],
    topic: quizState.lesson?.title || '',
    explanation: q.explain || ''
  }));
  const userAnswers = answers.map((a, i) => a >= 0 ? a : null);

  try {
    const res = await fetch('/api/ai/grade-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercises, userAnswers, difficulty: quizState.difficulty || 'medium' })
    });
    const grading = await res.json();
    if (grading.error) throw new Error(grading.error);
    renderAIGrading(grading, gradeEl);
  } catch (e) {
    gradeEl.innerHTML = `<div class="rex-grading-error">❌ ${e.message}</div>`;
  }
}

async function saveQuizProgress(lessonId, score, total) {
  try {
    await fetch('/api/english/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, score, totalQ: total })
    });
    await loadProgress();
    renderLessons();
    renderExerciseList();
  } catch (e) { console.error('Save progress error:', e); }
}

function setupQuizNav() {
  $('quiz-btn-next').onclick = () => {
    if (!quizState || quizState.finished) return;
    if (quizState.currentQ < quizState.questions.length - 1) {
      quizState.currentQ++;
      renderQuizQuestion();
    } else {
      quizState.finished = true;
      renderQuizResult();
    }
  };
  $('quiz-btn-prev').onclick = () => {
    if (!quizState || quizState.currentQ <= 0) return;
    quizState.currentQ--;
    renderQuizQuestion();
  };
  $('quiz-modal-close').onclick = () => $('quiz-modal').style.display = 'none';
  $('quiz-modal').onclick = e => { if (e.target === $('quiz-modal')) $('quiz-modal').style.display = 'none'; };
}

// ===== VOCABULARY =====
async function loadVocab() {
  try {
    const params = new URLSearchParams();
    const search = $('vocab-search')?.value?.trim();
    const level = $('vocab-level')?.value;
    if (search) params.set('search', search);
    if (level) params.set('level', level);

    const res = await fetch('/api/english/vocab?' + params);
    vocabList = await res.json();
    renderVocab();
    updateStats();
  } catch (e) { console.error('Load vocab error:', e); }
}

function renderVocab() {
  const grid = $('vocab-grid');
  if (vocabList.length === 0) {
    grid.innerHTML = `
      <div class="en-vocab-empty" style="grid-column: 1/-1">
        <div class="en-vocab-empty-icon">📖</div>
        <p>Chưa có từ vựng nào</p>
        <p style="font-size:0.75rem">Thêm từ mới để bắt đầu học!</p>
      </div>`;
    return;
  }

  grid.innerHTML = vocabList.map(v => `
    <div class="en-vocab-card ${v.mastered ? 'mastered' : ''}" data-id="${v.id}">
      <div class="en-vocab-word">${escapeHtml(v.word)}</div>
      ${v.phonetic ? `<div class="en-vocab-phonetic">${escapeHtml(v.phonetic)}</div>` : ''}
      <div class="en-vocab-meaning">${escapeHtml(v.meaning)}</div>
      ${v.example ? `<div class="en-vocab-example">"${escapeHtml(v.example)}"</div>` : ''}
      <div class="en-vocab-footer">
        <span class="en-vocab-level ${v.level}">${v.level}</span>
        <div class="en-vocab-actions">
          <button class="en-vocab-btn mastered-btn ${v.mastered ? 'active' : ''}" data-id="${v.id}" title="${v.mastered ? 'Đã thuộc' : 'Đánh dấu thuộc'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="en-vocab-btn edit-btn" data-id="${v.id}" title="Sửa">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="en-vocab-btn delete-btn" data-id="${v.id}" title="Xóa">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>`).join('');

  // Event delegation
  grid.querySelectorAll('.mastered-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleMastered(btn.dataset.id));
  });
  grid.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditVocab(btn.dataset.id));
  });
  grid.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteVocab(btn.dataset.id));
  });
}

function setupVocabEvents() {
  let searchTimeout;
  $('vocab-search')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadVocab, 300);
  });
  $('vocab-level')?.addEventListener('change', loadVocab);

  $('btn-add-vocab')?.addEventListener('click', () => openAddVocab());
  $('vocab-modal-cancel')?.addEventListener('click', closeVocabModal);
  $('vocab-modal-close')?.addEventListener('click', closeVocabModal);
  $('vocab-modal')?.addEventListener('click', e => { if (e.target === $('vocab-modal')) closeVocabModal(); });
  $('vocab-modal-save')?.addEventListener('click', saveVocab);

  // AI lookup button
  $('btn-ai-lookup')?.addEventListener('click', aiLookupWord);
  // AI + Save button
  $('vocab-ai-save')?.addEventListener('click', aiLookupAndSave);
  // Enter in word input triggers AI lookup
  $('vocab-word')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); aiLookupWord(); }
  });

  // CSV Import
  $('btn-import-vocab')?.addEventListener('click', () => $('csv-file-input')?.click());
  $('csv-file-input')?.addEventListener('change', handleCSVImport);
}

function openAddVocab() {
  editingVocabId = null;
  $('vocab-modal-title').textContent = 'Thêm từ vựng';
  $('vocab-word').value = '';
  $('vocab-phonetic').value = '';
  $('vocab-meaning').value = '';
  $('vocab-example').value = '';
  $('vocab-category').value = '';
  $('vocab-level-input').value = 'beginner';
  $('vocab-modal').style.display = '';
  $('vocab-word').focus();
}

function openEditVocab(id) {
  const v = vocabList.find(v => v.id === id);
  if (!v) return;
  editingVocabId = id;
  $('vocab-modal-title').textContent = 'Sửa từ vựng';
  $('vocab-word').value = v.word;
  $('vocab-phonetic').value = v.phonetic || '';
  $('vocab-meaning').value = v.meaning;
  $('vocab-example').value = v.example || '';
  $('vocab-category').value = v.category || '';
  $('vocab-level-input').value = v.level || 'beginner';
  $('vocab-modal').style.display = '';
  $('vocab-word').focus();
}

function closeVocabModal() {
  $('vocab-modal').style.display = 'none';
  editingVocabId = null;
  const status = $('ai-lookup-status');
  if (status) { status.style.display = 'none'; status.textContent = ''; }
}

async function aiLookupWord() {
  const word = $('vocab-word').value.trim();
  if (!word) return alert('Nhập từ tiếng Anh trước!');

  const status = $('ai-lookup-status');
  const btn = $('btn-ai-lookup');
  status.style.display = '';
  status.className = 'en-ai-status loading';
  status.textContent = '🔄 AI đang tra cứu...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/english/vocab/ai-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
    if (!res.ok) throw new Error('AI lookup failed');
    const data = await res.json();

    // Fill in fields
    if (data.phonetic) $('vocab-phonetic').value = data.phonetic;
    if (data.meaning) $('vocab-meaning').value = data.meaning;
    if (data.example) $('vocab-example').value = data.example;
    if (data.category) $('vocab-category').value = data.category;
    if (data.level) $('vocab-level-input').value = data.level;

    status.className = 'en-ai-status success';
    status.textContent = '✅ AI đã điền thông tin! Bạn có thể chỉnh sửa rồi Lưu.';
  } catch (e) {
    console.error('AI lookup error:', e);
    status.className = 'en-ai-status error';
    status.textContent = '❌ AI không tra cứu được. Hãy nhập thủ công.';
  } finally {
    btn.disabled = false;
  }
}

async function aiLookupAndSave() {
  const word = $('vocab-word').value.trim();
  if (!word) return alert('Nhập từ tiếng Anh trước!');

  const status = $('ai-lookup-status');
  const btn = $('vocab-ai-save');
  status.style.display = '';
  status.className = 'en-ai-status loading';
  status.textContent = '🔄 AI đang tra cứu & lưu...';
  btn.disabled = true;

  try {
    // Send only word — backend will AI-fill + save
    const res = await fetch('/api/english/vocab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi lưu');
    }
    closeVocabModal();
    await loadVocab();
  } catch (e) {
    console.error('AI save error:', e);
    status.className = 'en-ai-status error';
    status.textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

async function saveVocab() {
  const word = $('vocab-word').value.trim();
  const meaning = $('vocab-meaning').value.trim();
  if (!word) return alert('Vui lòng nhập từ tiếng Anh!');

  const data = {
    word,
    meaning,
    phonetic: $('vocab-phonetic').value.trim(),
    example: $('vocab-example').value.trim(),
    category: $('vocab-category').value.trim(),
    level: $('vocab-level-input').value
  };

  try {
    if (editingVocabId) {
      await fetch(`/api/english/vocab/${editingVocabId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      // If no meaning, backend will auto-lookup via AI
      const res = await fetch('/api/english/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        return alert(err.error || 'Lỗi lưu từ vựng');
      }
    }
    closeVocabModal();
    await loadVocab();
  } catch (e) { console.error('Save vocab error:', e); }
}

async function toggleMastered(id) {
  try {
    await fetch(`/api/english/vocab/${id}/mastered`, { method: 'PATCH' });
    await loadVocab();
  } catch (e) { console.error('Toggle mastered error:', e); }
}

async function deleteVocab(id) {
  if (!confirm('Xóa từ vựng này?')) return;
  try {
    await fetch(`/api/english/vocab/${id}`, { method: 'DELETE' });
    await loadVocab();
  } catch (e) { console.error('Delete vocab error:', e); }
}

// ===== CSV IMPORT =====

async function handleCSVImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = ''; // reset

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return alert('File CSV cần ít nhất 1 header + 1 dòng dữ liệu!');

  // Parse header
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase().trim());

  // Map columns
  const wordIdx = headers.findIndex(h => h === 'word' || h === 'từ' || h === 'english');
  const meaningIdx = headers.findIndex(h => h === 'meaning' || h === 'nghĩa' || h === 'nghia' || h === 'vietnamese' || h === 'tiếng việt');
  const exampleIdx = headers.findIndex(h => h === 'example' || h === 'ví dụ' || h === 'vi du');
  const phoneticIdx = headers.findIndex(h => h === 'phonetic' || h === 'phiên âm' || h === 'phien am' || h === 'ipa');
  const categoryIdx = headers.findIndex(h => h === 'category' || h === 'danh mục' || h === 'danh muc');
  const levelIdx = headers.findIndex(h => h === 'level' || h === 'cấp độ' || h === 'cap do');

  if (wordIdx === -1 || meaningIdx === -1) {
    return alert('CSV phải có cột "word" và "meaning" (hoặc "từ" và "nghĩa")!\n\nVí dụ:\nword,meaning,example,phonetic,category,level\naccomplish,hoàn thành,She accomplished her goal.,/əˈkɑːmplɪʃ/,academic,intermediate');
  }

  const vocabList = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], delimiter);
    const word = (cols[wordIdx] || '').trim();
    const meaning = (cols[meaningIdx] || '').trim();
    if (!word || !meaning) continue;

    vocabList.push({
      word,
      meaning,
      example: exampleIdx >= 0 ? (cols[exampleIdx] || '').trim() : '',
      phonetic: phoneticIdx >= 0 ? (cols[phoneticIdx] || '').trim() : '',
      category: categoryIdx >= 0 ? (cols[categoryIdx] || '').trim() : 'general',
      level: levelIdx >= 0 ? (cols[levelIdx] || '').trim() : 'beginner'
    });
  }

  if (vocabList.length === 0) return alert('Không tìm thấy từ vựng hợp lệ trong file!');

  if (!confirm(`Tìm thấy ${vocabList.length} từ vựng. Bạn muốn import?`)) return;

  try {
    const res = await fetch('/api/english/vocab/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vocabList })
    });
    const data = await res.json();
    if (data.error) return alert('Lỗi: ' + data.error);
    alert(`✅ Đã import ${data.imported} từ vựng${data.skipped > 0 ? ` (bỏ qua ${data.skipped} dòng lỗi)` : ''}!`);
    await loadVocab();
  } catch (e) {
    console.error('Import error:', e);
    alert('Lỗi kết nối server!');
  }
}

function parseCSVLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ===== WORD OF THE DAY =====

async function loadWordOfDay() {
  try {
    const res = await fetch('/api/english/word-of-day');
    const word = await res.json();
    if (!word || !word.word) return;

    const box = $('wotd-box');
    if (!box) return;
    box.style.display = '';
    $('wotd-word').textContent = word.word;
    $('wotd-phonetic').textContent = word.phonetic || '';
    $('wotd-meaning').textContent = word.meaning;
    $('wotd-example').textContent = word.example || '';
  } catch (e) {
    console.error('Word of day error:', e);
  }
}

// ===== STREAK =====

async function loadStreak() {
  try {
    const res = await fetch('/api/english/streak');
    const data = await res.json();
    const el = $('stat-streak');
    if (el) {
      el.textContent = `🔥 ${data.streak || 0}`;
      if (data.streak >= 7) el.style.color = '#f59e0b';
      if (data.streak >= 30) el.style.color = '#ef4444';
    }
  } catch (e) {
    console.error('Streak error:', e);
  }
}

// ===== UTILS =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== FLASHCARD / SPACED REPETITION =====
let fcWords = [];
let fcIndex = 0;
let fcFlipped = false;

async function loadFlashcardDue() {
  try {
    const res = await fetch('/api/english/vocab/review');
    fcWords = await res.json();
    const countEl = $('fc-due-count');
    if (countEl) countEl.textContent = fcWords.length;
  } catch (e) { console.error('Load due error:', e); }
}

function startFlashcard() {
  if (fcWords.length === 0) { alert('Không có từ cần ôn tập! Hãy thêm từ vựng mới.'); return; }
  fcIndex = 0; fcFlipped = false;
  $('fc-area').style.display = 'block';
  $('fc-done').style.display = 'none';
  showFlashcard();
}

function showFlashcard() {
  if (fcIndex >= fcWords.length) { finishFlashcard(); return; }
  const w = fcWords[fcIndex];
  $('fc-word').textContent = w.word;
  $('fc-phonetic').textContent = w.phonetic || '';
  $('fc-meaning').textContent = w.meaning;
  $('fc-example').textContent = w.example || '';
  $('fc-progress-text').textContent = `${fcIndex + 1}/${fcWords.length}`;
  $('fc-bar-fill').style.width = ((fcIndex + 1) / fcWords.length * 100) + '%';
  $('fc-card-inner').classList.remove('flipped');
  $('fc-rating').style.display = 'none';
  fcFlipped = false;
}

function flipCard() {
  if (!fcFlipped) {
    $('fc-card-inner').classList.add('flipped');
    $('fc-rating').style.display = 'block';
    fcFlipped = true;
  }
}

async function rateFlashcard(quality) {
  const w = fcWords[fcIndex];
  try {
    await fetch(`/api/english/vocab/${w.id || w._id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality })
    });
  } catch (e) { console.error('Rate error:', e); }
  fcIndex++;
  showFlashcard();
}

function finishFlashcard() {
  $('fc-area').style.display = 'none';
  $('fc-done').style.display = 'block';
  $('fc-done-msg').textContent = `Bạn đã ôn tập ${fcWords.length} từ! Tiếp tục ôn tập mỗi ngày để ghi nhớ tốt hơn.`;
}

function setupFlashcard() {
  const startBtn = $('btn-start-flashcard');
  const restartBtn = $('btn-fc-restart');
  const card = $('fc-card');
  if (startBtn) startBtn.onclick = startFlashcard;
  if (restartBtn) restartBtn.onclick = () => { loadFlashcardDue().then(() => startFlashcard()); };
  if (card) card.onclick = flipCard;
  document.querySelectorAll('.en-fc-rbtn').forEach(btn => {
    btn.onclick = () => rateFlashcard(parseInt(btn.dataset.q));
  });
  loadFlashcardDue();
}

// ===== CONVERSATION PRACTICE =====
let convSessionId = 'conv_' + Date.now();

function startConversation() {
  convSessionId = 'conv_' + Date.now();
  const chatArea = document.getElementById('conv-chat');
  const messages = document.getElementById('conv-messages');
  if (chatArea) chatArea.style.display = 'block';
  if (messages) messages.innerHTML = '';
  document.getElementById('conv-turn-count').textContent = '0 lượt';

  const scenario = document.getElementById('conv-scenario')?.value || 'general';
  const scenarioLabels = { general: '🗣️ Trò chuyện', restaurant: '🍕 Nhà hàng', shopping: '🛒 Mua sắm', interview: '💼 Phỏng vấn', travel: '✈️ Du lịch', doctor: '🏥 Khám bệnh' };
  addConvMessage('system', `Bắt đầu luyện tập: ${scenarioLabels[scenario] || scenario}. Hãy nói tiếng Anh!`);

  // Send initial greeting
  sendConvRequest('Hello!');
}

async function sendConvMessage() {
  const input = document.getElementById('conv-input');
  if (!input || !input.value.trim()) return;
  const msg = input.value.trim();
  input.value = '';
  addConvMessage('user', msg);
  await sendConvRequest(msg);
}

async function sendConvRequest(message) {
  const scenario = document.getElementById('conv-scenario')?.value || 'general';
  const level = document.getElementById('conv-level')?.value || 'intermediate';
  const sendBtn = document.getElementById('conv-send-btn');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '...'; }

  try {
    const res = await fetch('/api/ai/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId: convSessionId, scenario, level })
    });
    const data = await res.json();
    if (data.reply) addConvMessage('ai', data.reply);
    if (data.feedback) addConvMessage('feedback', data.feedback);
    if (data.turns) document.getElementById('conv-turn-count').textContent = `${data.turns} lượt`;
  } catch {
    addConvMessage('system', '❌ Lỗi kết nối AI');
  }
  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Gửi'; }
}

function addConvMessage(type, text) {
  const container = document.getElementById('conv-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `conv-msg conv-msg-${type}`;
  const labels = { user: '🧑 Bạn', ai: '🤖 AI', system: '📌', feedback: '📝 Nhận xét' };
  div.innerHTML = `<span class="conv-msg-label">${labels[type] || ''}</span><span class="conv-msg-text">${text.replace(/\n/g, '<br>')}</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function endConversation() {
  document.getElementById('conv-chat').style.display = 'none';
  addConvMessage('system', 'Kết thúc hội thoại.');
}

document.getElementById('conv-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); sendConvMessage(); }
});

// ==================== QUIZ GAME ====================
let qgState = null;
let qgTimer = null;
let qgHighScore = parseInt(localStorage.getItem('qg_highscore') || '0');
document.getElementById('qg-highscore') && (document.getElementById('qg-highscore').textContent = qgHighScore);

function startQuizGame(mode) {
  if (vocabList.length < 4) {
    return alert('Cần ít nhất 4 từ vựng để chơi Quiz Game!');
  }
  // Shuffle vocab and pick 10 questions
  const shuffled = [...vocabList].sort(() => Math.random() - 0.5);
  const count = Math.min(10, shuffled.length);
  const questions = shuffled.slice(0, count).map(v => {
    // Get 3 wrong options
    const wrongs = vocabList.filter(w => w.id !== v.id).sort(() => Math.random() - 0.5).slice(0, 3);
    return { vocab: v, wrongs, mode };
  });

  qgState = { mode, questions, current: 0, score: 0, combo: 0, maxCombo: 0, answers: [], timePerQ: 15 };
  document.getElementById('qg-mode-select').style.display = 'none';
  document.getElementById('qg-result').style.display = 'none';
  document.getElementById('qg-play-area').style.display = '';
  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (!qgState || qgState.current >= qgState.questions.length) return finishQuizGame();
  const q = qgState.questions[qgState.current];
  const v = q.vocab;
  const mode = q.mode;

  document.getElementById('qg-play-progress').textContent = `${qgState.current + 1}/${qgState.questions.length}`;
  document.getElementById('qg-play-score').textContent = `Điểm: ${qgState.score}`;
  document.getElementById('qg-combo').textContent = qgState.combo;
  document.getElementById('qg-play-feedback').style.display = 'none';

  let questionHTML = '';
  let optionsHTML = '';

  if (mode === 'meaning') {
    questionHTML = `<div class="qg-q-word">${escapeHtml(v.word)}</div>${v.phonetic ? `<div class="qg-q-phonetic">${escapeHtml(v.phonetic)}</div>` : ''}<div class="qg-q-hint">Chọn nghĩa đúng:</div>`;
    const opts = [...q.wrongs.map(w => ({ text: w.meaning, correct: false })), { text: v.meaning, correct: true }].sort(() => Math.random() - 0.5);
    optionsHTML = opts.map((o, i) => `<button class="qg-opt" onclick="answerQuiz(${i}, ${o.correct})">${escapeHtml(o.text)}</button>`).join('');
  } else if (mode === 'word') {
    questionHTML = `<div class="qg-q-word">${escapeHtml(v.meaning)}</div><div class="qg-q-hint">Chọn từ tiếng Anh đúng:</div>`;
    const opts = [...q.wrongs.map(w => ({ text: w.word, correct: false })), { text: v.word, correct: true }].sort(() => Math.random() - 0.5);
    optionsHTML = opts.map((o, i) => `<button class="qg-opt" onclick="answerQuiz(${i}, ${o.correct})">${escapeHtml(o.text)}</button>`).join('');
  } else if (mode === 'typing') {
    questionHTML = `<div class="qg-q-word">${escapeHtml(v.meaning)}</div>${v.example ? `<div class="qg-q-example">"${escapeHtml(v.example)}"</div>` : ''}<div class="qg-q-hint">Gõ từ tiếng Anh:</div>`;
    optionsHTML = `<div class="qg-typing-area"><input type="text" id="qg-typing-input" class="en-input" placeholder="Nhập từ..." autocomplete="off"><button class="en-btn en-btn-primary" onclick="checkTypingAnswer()">Kiểm tra</button></div>`;
  } else if (mode === 'listening') {
    questionHTML = `<div class="qg-q-listen"><button class="qg-listen-btn" onclick="speakWord('${escapeHtml(v.word)}')">🔊 Nghe phát âm</button></div><div class="qg-q-hint">Chọn từ bạn nghe được:</div>`;
    const opts = [...q.wrongs.map(w => ({ text: w.word, correct: false })), { text: v.word, correct: true }].sort(() => Math.random() - 0.5);
    optionsHTML = opts.map((o, i) => `<button class="qg-opt" onclick="answerQuiz(${i}, ${o.correct})">${escapeHtml(o.text)}</button>`).join('');
    // Auto-play sound
    setTimeout(() => speakWord(v.word), 300);
  }

  document.getElementById('qg-play-question').innerHTML = questionHTML;
  document.getElementById('qg-play-options').innerHTML = optionsHTML;

  // Start timer
  clearInterval(qgTimer);
  let timeLeft = qgState.timePerQ;
  document.getElementById('qg-play-timer').textContent = `⏱️ ${timeLeft}s`;
  qgTimer = setInterval(() => {
    timeLeft--;
    document.getElementById('qg-play-timer').textContent = `⏱️ ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(qgTimer);
      answerQuiz(-1, false);
    }
  }, 1000);

  if (mode === 'typing') {
    setTimeout(() => {
      const inp = document.getElementById('qg-typing-input');
      if (inp) {
        inp.focus();
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') checkTypingAnswer(); }, { once: true });
      }
    }, 100);
  }
}

function speakWord(word) {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.speak(u);
  }
}

function answerQuiz(index, correct) {
  clearInterval(qgTimer);
  const q = qgState.questions[qgState.current];
  const fb = document.getElementById('qg-play-feedback');
  
  if (correct) {
    qgState.combo++;
    if (qgState.combo > qgState.maxCombo) qgState.maxCombo = qgState.combo;
    const bonus = qgState.combo > 1 ? qgState.combo : 0;
    qgState.score += 10 + bonus;
    fb.innerHTML = `✅ Đúng rồi! +${10 + bonus} điểm ${bonus > 0 ? `(combo x${qgState.combo})` : ''}`;
    fb.className = 'qg-play-feedback qg-fb-correct';
  } else {
    qgState.combo = 0;
    const answer = q.mode === 'meaning' || q.mode === 'listening' ? q.vocab.meaning : q.vocab.word;
    fb.innerHTML = `❌ Sai rồi! Đáp án: <strong>${escapeHtml(q.vocab.word)}</strong> = ${escapeHtml(q.vocab.meaning)}`;
    fb.className = 'qg-play-feedback qg-fb-wrong';
  }
  fb.style.display = '';
  qgState.answers.push({ vocab: q.vocab, correct });
  document.getElementById('qg-combo').textContent = qgState.combo;
  document.getElementById('qg-play-score').textContent = `Điểm: ${qgState.score}`;

  // Disable options
  document.querySelectorAll('.qg-opt').forEach(b => b.disabled = true);

  setTimeout(() => {
    qgState.current++;
    renderQuizQuestion();
  }, 1500);
}

function checkTypingAnswer() {
  const input = document.getElementById('qg-typing-input');
  if (!input) return;
  const answer = input.value.trim().toLowerCase();
  const correct = answer === qgState.questions[qgState.current].vocab.word.toLowerCase();
  answerQuiz(-1, correct);
}

function finishQuizGame() {
  clearInterval(qgTimer);
  document.getElementById('qg-play-area').style.display = 'none';
  document.getElementById('qg-result').style.display = '';

  const correct = qgState.answers.filter(a => a.correct).length;
  const total = qgState.questions.length;
  const pct = Math.round((correct / total) * 100);

  if (qgState.score > qgHighScore) {
    qgHighScore = qgState.score;
    localStorage.setItem('qg_highscore', qgHighScore);
    document.getElementById('qg-highscore').textContent = qgHighScore;
  }

  let title = pct >= 80 ? '🎉 Xuất sắc!' : pct >= 50 ? '👍 Khá tốt!' : '💪 Cần luyện thêm!';
  document.getElementById('qg-result-title').textContent = title;
  document.getElementById('qg-result-stats').innerHTML = `
    <div class="qg-rs-item"><span class="qg-rs-num">${correct}/${total}</span><span class="qg-rs-label">Đúng</span></div>
    <div class="qg-rs-item"><span class="qg-rs-num">${qgState.score}</span><span class="qg-rs-label">Điểm</span></div>
    <div class="qg-rs-item"><span class="qg-rs-num">x${qgState.maxCombo}</span><span class="qg-rs-label">Max Combo</span></div>
    <div class="qg-rs-item"><span class="qg-rs-num">${pct}%</span><span class="qg-rs-label">Tỷ lệ</span></div>
  `;

  // AI analysis for wrong answers
  aiGradeVocabQuiz();
}

async function aiGradeVocabQuiz() {
  if (!qgState || !qgState.answers.length) return;
  const wrongAnswers = qgState.answers.filter(a => !a.correct);
  if (wrongAnswers.length === 0) {
    const el = document.getElementById('qg-ai-analysis');
    if (el) el.innerHTML = `<div class="rex-gr-comment">🎉 Hoàn hảo! Bạn đã trả lời đúng tất cả các câu!</div>`;
    return;
  }

  const el = document.getElementById('qg-ai-analysis');
  if (!el) return;
  el.innerHTML = `<div class="rex-grading-loading"><div class="rex-grading-spinner"></div> 🤖 AI đang phân tích từ sai...</div>`;

  // Build data for AI
  const exercises = qgState.answers.map((a, i) => {
    const mode = qgState.mode;
    const question = mode === 'meaning' || mode === 'listening'
      ? `Nghĩa của từ "${a.vocab.word}" ${a.vocab.phonetic ? '(' + a.vocab.phonetic + ')' : ''}`
      : `Từ tiếng Anh cho nghĩa "${a.vocab.meaning}"`;
    return {
      type: mode === 'typing' ? 'fill_blank' : 'multiple_choice',
      question,
      answer: mode === 'meaning' || mode === 'listening' ? a.vocab.meaning : a.vocab.word,
      topic: `vocabulary - ${a.vocab.category || 'general'} (${a.vocab.level || 'beginner'})`
    };
  });
  const userAnswers = qgState.answers.map(a => a.correct ? a.vocab.word : '(sai)');

  try {
    const res = await fetch('/api/ai/grade-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercises, userAnswers, difficulty: 'medium' })
    });
    const grading = await res.json();
    if (grading.error) throw new Error(grading.error);
    renderAIGrading(grading, el);
  } catch (e) {
    el.innerHTML = `<div class="rex-grading-error">❌ ${e.message}</div>`;
  }
}

// ==================== GRAMMAR CHECK ====================
document.getElementById('gc-input')?.addEventListener('input', function() {
  document.getElementById('gc-charcount').textContent = this.value.length;
});

async function runGrammarCheck() {
  const text = document.getElementById('gc-input')?.value?.trim();
  if (!text) return alert('Vui lòng nhập văn bản tiếng Anh!');

  const btn = document.getElementById('btn-grammar-check');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Đang kiểm tra...'; }

  try {
    const res = await fetch('/api/ai/grammar-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    displayGrammarResult(data);
  } catch (e) {
    alert('Lỗi: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Kiểm tra ngữ pháp'; }
}

function displayGrammarResult(data) {
  const resultEl = document.getElementById('gc-result');
  resultEl.style.display = '';

  // Score
  const score = data.score || 0;
  const scoreCircle = document.getElementById('gc-score-circle');
  scoreCircle.style.background = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  document.getElementById('gc-score-num').textContent = score;
  document.getElementById('gc-feedback').textContent = data.feedback || '';

  // Corrected text
  if (data.correctedText && data.correctedText !== document.getElementById('gc-input').value.trim()) {
    document.getElementById('gc-corrected').style.display = '';
    document.getElementById('gc-corrected-text').textContent = data.correctedText;
  } else {
    document.getElementById('gc-corrected').style.display = 'none';
  }

  // Errors
  const errorsEl = document.getElementById('gc-errors');
  if (data.errors && data.errors.length > 0) {
    errorsEl.innerHTML = '<h4>🔍 Lỗi phát hiện:</h4>' + data.errors.map(e => `
      <div class="gc-error-item">
        <div class="gc-error-original">❌ <s>${escapeHtml(e.original)}</s> → ✅ <strong>${escapeHtml(e.correction)}</strong></div>
        <div class="gc-error-rule">📏 ${escapeHtml(e.rule)}</div>
        <div class="gc-error-explain">💡 ${escapeHtml(e.explanation)}</div>
      </div>
    `).join('');
  } else {
    errorsEl.innerHTML = '<div class="gc-perfect">✅ Hoàn hảo! Không phát hiện lỗi ngữ pháp.</div>';
  }

  // Suggestions
  if (data.suggestions && data.suggestions.length > 0) {
    document.getElementById('gc-suggestions').style.display = '';
    document.getElementById('gc-suggestions-list').innerHTML = data.suggestions.map(s => `<li>${escapeHtml(s)}</li>`).join('');
  } else {
    document.getElementById('gc-suggestions').style.display = 'none';
  }
}

// ==================== RANDOM EXERCISES ====================
let rexState = null;

// Load exercise history from localStorage to avoid duplicate questions
function getRexHistory() {
  try {
    const hist = JSON.parse(localStorage.getItem('rex_question_history') || '[]');
    return Array.isArray(hist) ? hist.slice(-50) : [];
  } catch { return []; }
}

function saveRexHistory(questions) {
  const hist = getRexHistory();
  hist.push(...questions);
  // Keep only last 100 questions
  const trimmed = hist.slice(-100);
  localStorage.setItem('rex_question_history', JSON.stringify(trimmed));
}

function clearRexHistory() {
  localStorage.removeItem('rex_question_history');
}

async function generateRandomExercises() {
  const difficulty = document.getElementById('rex-difficulty')?.value || 'medium';
  const count = parseInt(document.getElementById('rex-count')?.value || '5');
  const topic = document.getElementById('rex-topic')?.value;
  const topics = topic ? [topic] : null;
  const previousQuestions = getRexHistory();

  const btn = document.getElementById('btn-gen-random');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Đang tạo bài tập...'; }
  document.getElementById('rex-result').style.display = 'none';

  try {
    const res = await fetch('/api/ai/random-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, difficulty, topics, previousQuestions })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.exercises || data.exercises.length === 0) throw new Error('Không tạo được bài tập');

    // Save new questions to history
    saveRexHistory(data.exercises.map(ex => ex.question));

    rexState = { exercises: data.exercises, answers: new Array(data.exercises.length).fill(null), submitted: false };
    renderRandomExercises();
  } catch (e) {
    document.getElementById('rex-exercises').innerHTML = `<div class="rex-error">❌ ${e.message}</div>`;
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M22 12.5a10 10 0 0 1-18.8 4.3"/></svg> Tạo bài tập'; }
}

function renderRandomExercises() {
  if (!rexState) return;
  const container = document.getElementById('rex-exercises');
  container.innerHTML = rexState.exercises.map((ex, i) => {
    const typeLabels = { multiple_choice: '🔢 Trắc nghiệm', fill_blank: '✏️ Điền từ', correction: '🔍 Sửa lỗi', translation: '🌐 Dịch', word_order: '🔀 Sắp xếp' };
    let bodyHTML = '';

    if (ex.type === 'multiple_choice' && ex.options) {
      bodyHTML = ex.options.map((opt, oi) => `
        <label class="rex-option ${rexState.submitted ? (opt === ex.answer ? 'rex-opt-correct' : (rexState.answers[i] === oi ? 'rex-opt-wrong' : '')) : ''}">
          <input type="radio" name="rex-q${i}" value="${oi}" ${rexState.submitted ? 'disabled' : ''} ${rexState.answers[i] === oi ? 'checked' : ''} onchange="rexState.answers[${i}]=${oi}">
          ${escapeHtml(opt)}
        </label>
      `).join('');
    } else {
      bodyHTML = `<input type="text" class="en-input rex-text-input" id="rex-input-${i}" placeholder="Nhập đáp án..." ${rexState.submitted ? 'disabled' : ''} value="${rexState.answers[i] || ''}" oninput="rexState.answers[${i}]=this.value">`;
      if (rexState.submitted) {
        bodyHTML += `<div class="rex-answer">Đáp án: <strong>${escapeHtml(ex.answer)}</strong></div>`;
      }
    }

    return `
      <div class="rex-exercise ${rexState.submitted ? 'rex-submitted' : ''}">
        <div class="rex-ex-header">
          <span class="rex-ex-num">${i + 1}</span>
          <span class="rex-ex-type">${typeLabels[ex.type] || ex.type}</span>
          ${ex.topic ? `<span class="rex-ex-topic">${escapeHtml(ex.topic)}</span>` : ''}
        </div>
        <div class="rex-ex-question">${escapeHtml(ex.question)}</div>
        <div class="rex-ex-body">${bodyHTML}</div>
        ${rexState.submitted && ex.explanation ? `<div class="rex-ex-explain">💡 ${escapeHtml(ex.explanation)}</div>` : ''}
      </div>
    `;
  }).join('');

  if (!rexState.submitted) {
    container.innerHTML += `<button class="en-btn en-btn-primary rex-submit-btn" onclick="submitRandomExercises()">📝 Nộp bài</button>`;
  }
}

async function submitRandomExercises() {
  if (!rexState) return;
  rexState.submitted = true;

  // Quick local check first
  let correct = 0;
  rexState.exercises.forEach((ex, i) => {
    if (ex.type === 'multiple_choice' && ex.options) {
      if (rexState.answers[i] !== null && ex.options[rexState.answers[i]] === ex.answer) correct++;
    } else {
      const userAns = (rexState.answers[i] || '').trim().toLowerCase();
      if (userAns === (ex.answer || '').trim().toLowerCase()) correct++;
    }
  });

  const total = rexState.exercises.length;
  const pct = Math.round((correct / total) * 100);
  renderRandomExercises();

  const resultEl = document.getElementById('rex-result');
  resultEl.style.display = '';
  resultEl.querySelector('#rex-result-summary').innerHTML = `
    <div class="rex-summary-score" style="color:${pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'}">
      ${correct}/${total} đúng (${pct}%)
    </div>
    <div class="rex-summary-msg">${pct >= 70 ? '🎉 Tuyệt vời!' : pct >= 40 ? '👍 Khá tốt, hãy luyện thêm!' : '💪 Cần cố gắng hơn!'}</div>
  `;

  // AI grading
  const gradingEl = document.getElementById('rex-ai-grading');
  gradingEl.innerHTML = `<div class="rex-grading-loading"><div class="rex-grading-spinner"></div> 🤖 AI đang chấm bài và phân tích chi tiết...</div>`;

  try {
    const difficulty = document.getElementById('rex-difficulty')?.value || 'medium';
    const res = await fetch('/api/ai/grade-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercises: rexState.exercises,
        userAnswers: rexState.answers,
        difficulty
      })
    });
    const grading = await res.json();
    if (grading.error) throw new Error(grading.error);
    rexState.grading = grading;
    renderAIGrading(grading);
  } catch (e) {
    gradingEl.innerHTML = `<div class="rex-grading-error">❌ Không thể chấm bài bằng AI: ${e.message}</div>`;
  }
}

function renderAIGrading(grading, targetEl) {
  const gradingEl = targetEl || document.getElementById('rex-ai-grading');
  const levelIcons = { excellent: '🏆', good: '👍', average: '📝', needsImprovement: '💪' };
  const levelLabels = { excellent: 'Xuất sắc', good: 'Tốt', average: 'Trung bình', needsImprovement: 'Cần cải thiện' };
  const errorIcons = { grammar: '📐', vocabulary: '📖', spelling: '✏️', comprehension: '🧠', none: '✅' };
  const errorLabels = { grammar: 'Ngữ pháp', vocabulary: 'Từ vựng', spelling: 'Chính tả', comprehension: 'Hiểu', none: 'Đúng' };

  let resultsHTML = '';
  if (grading.results && grading.results.length > 0) {
    resultsHTML = grading.results.map((r, i) => {
      const icon = r.isCorrect ? '✅' : '❌';
      const cls = r.isCorrect ? 'rex-gr-correct' : 'rex-gr-wrong';
      return `
        <div class="rex-gr-item ${cls}">
          <div class="rex-gr-head">
            <span class="rex-gr-icon">${icon}</span>
            <span class="rex-gr-num">Câu ${i + 1}</span>
            ${!r.isCorrect && r.errorType && r.errorType !== 'none' ? `<span class="rex-gr-error-tag">${errorIcons[r.errorType] || '⚠️'} ${errorLabels[r.errorType] || r.errorType}</span>` : ''}
          </div>
          ${!r.isCorrect ? `
            <div class="rex-gr-answers">
              <div class="rex-gr-user">Bạn trả lời: <strong>${escapeHtml(r.userAnswer || '(bỏ trống)')}</strong></div>
              <div class="rex-gr-correct-ans">Đáp án đúng: <strong>${escapeHtml(r.correctAnswer || '')}</strong></div>
            </div>
            ${r.errorDetail ? `<div class="rex-gr-error-detail">⚠️ <strong>Lỗi sai:</strong> ${escapeHtml(r.errorDetail)}</div>` : ''}
          ` : ''}
          ${r.knowledgePoint ? `<div class="rex-gr-knowledge">📚 <strong>Kiến thức:</strong> ${escapeHtml(r.knowledgePoint)}</div>` : ''}
          ${r.explanation ? `<div class="rex-gr-explain">💡 <strong>Giải thích:</strong> ${escapeHtml(r.explanation)}</div>` : ''}
          ${r.tip ? `<div class="rex-gr-tip">💡 <strong>Mẹo:</strong> ${escapeHtml(r.tip)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  let weakTopicsHTML = '';
  if (grading.weakTopics && grading.weakTopics.length > 0) {
    weakTopicsHTML = `
      <div class="rex-gr-weak">
        <h4>📋 Chủ đề cần ôn tập:</h4>
        <div class="rex-gr-weak-tags">${grading.weakTopics.map(t => `<span class="rex-gr-weak-tag">${escapeHtml(t)}</span>`).join('')}</div>
      </div>
    `;
  }

  gradingEl.innerHTML = `
    <div class="rex-grading-result">
      <div class="rex-gr-header">
        <div class="rex-gr-title">🤖 AI Chấm Bài Chi Tiết</div>
        <div class="rex-gr-level">${levelIcons[grading.overallLevel] || '📝'} ${levelLabels[grading.overallLevel] || ''}</div>
      </div>
      ${grading.overallComment ? `<div class="rex-gr-comment">${escapeHtml(grading.overallComment)}</div>` : ''}
      <div class="rex-gr-list">${resultsHTML}</div>
      ${weakTopicsHTML}
      ${grading.studyAdvice ? `<div class="rex-gr-advice">🎯 <strong>Lời khuyên:</strong> ${escapeHtml(grading.studyAdvice)}</div>` : ''}
    </div>
  `;
}

// ==================== LISTENING PRACTICE ====================
let lstState = null;
let lstPlayCount = 0;

async function generateListening() {
  const level = document.getElementById('lst-level')?.value || 'intermediate';
  const topic = document.getElementById('lst-topic')?.value || '';
  const btn = document.getElementById('btn-gen-listening');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Đang tạo bài nghe...'; }
  document.getElementById('lst-area').style.display = 'none';

  try {
    const res = await fetch('/api/ai/listening', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, topic })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.passage || !data.questions) throw new Error('Không tạo được bài nghe');

    lstState = { data, answers: {}, submitted: false };
    lstPlayCount = 0;
    renderListening();
  } catch (e) {
    alert('Lỗi: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '🎧 Tạo bài nghe'; }
}

function renderListening() {
  if (!lstState) return;
  const { data, answers, submitted } = lstState;
  document.getElementById('lst-area').style.display = '';
  document.getElementById('lst-title').textContent = data.title || 'Bài luyện nghe';
  document.getElementById('lst-plays').textContent = `Đã nghe: ${lstPlayCount} lần`;
  document.getElementById('lst-result').style.display = 'none';
  document.getElementById('lst-transcript').style.display = submitted ? '' : 'none';

  if (submitted) {
    document.getElementById('lst-transcript-text').innerHTML = `<p>${escapeHtml(data.passage)}</p>` +
      (data.transcript_vi ? `<p class="lst-vi-text">📝 ${escapeHtml(data.transcript_vi)}</p>` : '');
    if (data.vocabulary && data.vocabulary.length) {
      document.getElementById('lst-vocab-list').innerHTML = '<h4>📚 Từ vựng mới</h4>' +
        data.vocabulary.map(v => `<div class="lst-vocab-item"><strong>${escapeHtml(v.word)}</strong> ${v.phonetic ? `<span class="lst-phonetic">${escapeHtml(v.phonetic)}</span>` : ''} — ${escapeHtml(v.meaning)}</div>`).join('');
    }
  }

  // Render questions
  const qContainer = document.getElementById('lst-questions');
  qContainer.innerHTML = data.questions.map((q, i) => {
    let bodyHTML = '';
    if (q.type === 'fill_blank') {
      bodyHTML = `<div class="lst-q-instruction">🎧 ${escapeHtml(q.question)}</div>
        <input type="text" class="en-input lst-fill-input" id="lst-ans-${i}" placeholder="Điền từ..." ${submitted ? 'disabled' : ''} value="${answers[i] || ''}" oninput="lstState.answers[${i}]=this.value">`;
      if (submitted) {
        const correct = (answers[i] || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
        bodyHTML += `<div class="lst-q-feedback ${correct ? 'lst-correct' : 'lst-wrong'}">${correct ? '✅ Đúng!' : `❌ Đáp án: <strong>${escapeHtml(q.answer)}</strong>`}</div>`;
      }
    } else {
      bodyHTML = `<div class="lst-q-instruction">${escapeHtml(q.question)}</div>`;
      bodyHTML += q.options.map((opt, oi) => {
        let cls = 'lst-option';
        if (submitted) {
          if (oi === q.correct) cls += ' lst-opt-correct';
          else if (answers[i] === oi && oi !== q.correct) cls += ' lst-opt-wrong';
        } else if (answers[i] === oi) cls += ' lst-opt-selected';
        return `<label class="${cls}"><input type="radio" name="lst-q${i}" value="${oi}" ${submitted ? 'disabled' : ''} ${answers[i] === oi ? 'checked' : ''} onchange="lstState.answers[${i}]=${oi}"> ${escapeHtml(opt)}</label>`;
      }).join('');
      if (submitted && q.explain) {
        bodyHTML += `<div class="lst-q-explain">💡 ${escapeHtml(q.explain)}</div>`;
      }
    }
    return `<div class="lst-question"><div class="lst-q-num">Câu ${i + 1}</div>${bodyHTML}</div>`;
  }).join('');

  document.getElementById('lst-actions').style.display = submitted ? 'none' : '';
}

function playListening() {
  if (!lstState || !lstState.data.passage) return;
  const speed = parseFloat(document.getElementById('lst-speed')?.value || '0.9');
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(lstState.data.passage);
    u.lang = 'en-US';
    u.rate = speed;
    speechSynthesis.speak(u);
    lstPlayCount++;
    document.getElementById('lst-plays').textContent = `Đã nghe: ${lstPlayCount} lần`;
  } else {
    alert('Trình duyệt không hỗ trợ Text-to-Speech');
  }
}

function submitListening() {
  if (!lstState) return;
  lstState.submitted = true;
  let correct = 0;
  lstState.data.questions.forEach((q, i) => {
    if (q.type === 'fill_blank') {
      if ((lstState.answers[i] || '').trim().toLowerCase() === (q.answer || '').trim().toLowerCase()) correct++;
    } else {
      if (lstState.answers[i] === q.correct) correct++;
    }
  });

  const total = lstState.data.questions.length;
  const pct = Math.round((correct / total) * 100);
  const xpEarned = correct * 15;
  addXP(xpEarned, 'listening');

  renderListening();
  const resultEl = document.getElementById('lst-result');
  resultEl.style.display = '';
  resultEl.innerHTML = `
    <div class="lst-result-box">
      <div class="lst-result-score" style="color:${pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'}">
        ${correct}/${total} đúng (${pct}%)
      </div>
      <div class="lst-result-xp">+${xpEarned} XP 🏆</div>
      <div class="lst-result-msg">${pct >= 70 ? '🎉 Tuyệt vời!' : pct >= 40 ? '👍 Khá tốt!' : '💪 Cần luyện thêm!'}</div>
      <button class="en-btn en-btn-primary" onclick="generateListening()" style="margin-top:10px">🎧 Bài mới</button>
    </div>`;
}

// ==================== READING COMPREHENSION ====================
let rdgState = null;

async function generateReading() {
  const level = document.getElementById('rdg-level')?.value || 'intermediate';
  const topic = document.getElementById('rdg-topic')?.value || '';
  const btn = document.getElementById('btn-gen-reading');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Đang tạo bài đọc...'; }
  document.getElementById('rdg-area').style.display = 'none';

  try {
    const res = await fetch('/api/ai/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, topic })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.passage || !data.questions) throw new Error('Không tạo được bài đọc');

    rdgState = { data, answers: {}, submitted: false };
    renderReading();
  } catch (e) {
    alert('Lỗi: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '📖 Tạo bài đọc'; }
}

function renderReading() {
  if (!rdgState) return;
  const { data, answers, submitted } = rdgState;
  document.getElementById('rdg-area').style.display = '';
  document.getElementById('rdg-passage-title').textContent = data.title || 'Bài đọc';
  document.getElementById('rdg-passage-meta').textContent = `${data.wordCount || '?'} từ`;
  document.getElementById('rdg-passage-text').innerHTML = `<p>${escapeHtml(data.passage).replace(/\n/g, '</p><p>')}</p>`;
  document.getElementById('rdg-result').style.display = 'none';
  document.getElementById('rdg-extras').style.display = submitted ? '' : 'none';

  if (submitted) {
    if (data.summary_vi) {
      document.getElementById('rdg-summary').innerHTML = `<h4>📝 Tóm tắt tiếng Việt</h4><p>${escapeHtml(data.summary_vi)}</p>`;
    }
    if (data.vocabulary && data.vocabulary.length) {
      document.getElementById('rdg-vocab-list').innerHTML = '<h4>📚 Từ vựng mới</h4>' +
        data.vocabulary.map(v => `<div class="rdg-vocab-item"><strong>${escapeHtml(v.word)}</strong> ${v.phonetic ? `<span class="rdg-phonetic">${escapeHtml(v.phonetic)}</span>` : ''} — ${escapeHtml(v.meaning)}</div>`).join('');
    }
  }

  // Render questions
  const qContainer = document.getElementById('rdg-questions');
  qContainer.innerHTML = data.questions.map((q, i) => {
    let bodyHTML = '';
    if (q.type === 'true_false') {
      const opts = [{ label: 'True', val: true }, { label: 'False', val: false }];
      bodyHTML = `<div class="rdg-q-instruction">${escapeHtml(q.question)}</div>`;
      bodyHTML += opts.map(o => {
        let cls = 'rdg-option';
        if (submitted) {
          if (o.val === q.answer) cls += ' rdg-opt-correct';
          else if (answers[i] === o.val && o.val !== q.answer) cls += ' rdg-opt-wrong';
        } else if (answers[i] === o.val) cls += ' rdg-opt-selected';
        return `<label class="${cls}"><input type="radio" name="rdg-q${i}" ${submitted ? 'disabled' : ''} ${answers[i] === o.val ? 'checked' : ''} onchange="rdgState.answers[${i}]=${o.val}"> ${o.label}</label>`;
      }).join('');
    } else {
      bodyHTML = `<div class="rdg-q-instruction">${escapeHtml(q.question)}</div>`;
      bodyHTML += q.options.map((opt, oi) => {
        let cls = 'rdg-option';
        if (submitted) {
          if (oi === q.correct) cls += ' rdg-opt-correct';
          else if (answers[i] === oi && oi !== q.correct) cls += ' rdg-opt-wrong';
        } else if (answers[i] === oi) cls += ' rdg-opt-selected';
        return `<label class="${cls}"><input type="radio" name="rdg-q${i}" value="${oi}" ${submitted ? 'disabled' : ''} ${answers[i] === oi ? 'checked' : ''} onchange="rdgState.answers[${i}]=${oi}"> ${escapeHtml(opt)}</label>`;
      }).join('');
    }
    if (submitted && q.explain) {
      bodyHTML += `<div class="rdg-q-explain">💡 ${escapeHtml(q.explain)}</div>`;
    }
    return `<div class="rdg-question"><div class="rdg-q-num">Câu ${i + 1} <span class="rdg-q-type">${q.type === 'true_false' ? 'True/False' : 'MCQ'}</span></div>${bodyHTML}</div>`;
  }).join('');

  document.getElementById('rdg-actions').style.display = submitted ? 'none' : '';
}

function submitReading() {
  if (!rdgState) return;
  rdgState.submitted = true;
  let correct = 0;
  rdgState.data.questions.forEach((q, i) => {
    if (q.type === 'true_false') {
      if (rdgState.answers[i] === q.answer) correct++;
    } else {
      if (rdgState.answers[i] === q.correct) correct++;
    }
  });

  const total = rdgState.data.questions.length;
  const pct = Math.round((correct / total) * 100);
  const xpEarned = correct * 15;
  addXP(xpEarned, 'reading');

  renderReading();
  const resultEl = document.getElementById('rdg-result');
  resultEl.style.display = '';
  resultEl.innerHTML = `
    <div class="rdg-result-box">
      <div class="rdg-result-score" style="color:${pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'}">
        ${correct}/${total} đúng (${pct}%)
      </div>
      <div class="rdg-result-xp">+${xpEarned} XP 🏆</div>
      <div class="rdg-result-msg">${pct >= 70 ? '🎉 Tuyệt vời!' : pct >= 40 ? '👍 Khá tốt!' : '💪 Cần luyện thêm!'}</div>
      <button class="en-btn en-btn-primary" onclick="generateReading()" style="margin-top:10px">📖 Bài mới</button>
    </div>`;
}

// ==================== DAILY CHALLENGE ====================
let dcState = null;

function getDCKey() {
  return 'dc_' + new Date().toISOString().slice(0, 10);
}

function loadDCStatus() {
  // Check if today's challenge already done
  const saved = localStorage.getItem(getDCKey());
  const statusEl = document.getElementById('dc-status');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.completed) {
      statusEl.innerHTML = `<div class="dc-done-badge">✅ Bạn đã hoàn thành thử thách hôm nay! (+${parsed.xpEarned || 0} XP)</div>`;
      document.getElementById('btn-gen-dc').textContent = '🔄 Làm lại';
    } else {
      statusEl.innerHTML = '';
    }
  } else {
    statusEl.innerHTML = '<div class="dc-new-badge">🆕 Thử thách hôm nay đang chờ bạn!</div>';
  }

  // Load streak
  const streakData = JSON.parse(localStorage.getItem('dc_streak') || '{"count":0,"lastDate":""}');
  document.getElementById('dc-streak-badge').textContent = `🔥 ${streakData.count} ngày liên tiếp`;
}

async function generateDailyChallenge() {
  const level = document.getElementById('dc-level')?.value || 'intermediate';
  const btn = document.getElementById('btn-gen-dc');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Đang tạo thử thách...'; }

  try {
    const res = await fetch('/api/ai/daily-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.tasks || !data.tasks.length) throw new Error('Không tạo được thử thách');

    dcState = { data, answers: {}, taskResults: {}, submitted: false };
    renderDailyChallenge();
  } catch (e) {
    alert('Lỗi: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '🎯 Bắt đầu thử thách'; }
}

function renderDailyChallenge() {
  if (!dcState) return;
  const { data, answers, taskResults, submitted } = dcState;
  const container = document.getElementById('dc-tasks');
  document.getElementById('dc-result').style.display = 'none';

  container.innerHTML = `
    <div class="dc-theme">${data.theme ? `📌 Chủ đề: ${escapeHtml(data.theme)}` : ''}</div>
    ${data.tasks.map((task, i) => {
      const done = taskResults[i] !== undefined;
      let taskHTML = '';

      if (task.skill === 'listening') {
        taskHTML = `
          <div class="dc-task-instruction">${escapeHtml(task.instruction || 'Nghe và điền từ vào chỗ trống')}</div>
          <div class="dc-task-listen">
            <button class="en-btn en-btn-secondary dc-listen-btn" onclick="dcPlayAudio(${i})">🔊 Nghe</button>
          </div>
          <div class="dc-task-question">${escapeHtml(task.question || '')}</div>
          <input type="text" class="en-input dc-input" id="dc-ans-${i}" placeholder="Điền từ..." ${done ? 'disabled' : ''} value="${answers[i] || ''}" oninput="dcState.answers[${i}]=this.value">
          ${!done ? `<button class="en-btn en-btn-sm en-btn-primary" onclick="checkDCTask(${i})">Kiểm tra</button>` : ''}`;
      } else if (task.skill === 'reading') {
        taskHTML = `
          <div class="dc-task-instruction">${escapeHtml(task.instruction || 'Đọc đoạn văn và trả lời')}</div>
          <div class="dc-task-passage">${escapeHtml(task.passage || '')}</div>
          <div class="dc-task-question">${escapeHtml(task.question || '')}</div>
          ${(task.options || []).map((opt, oi) => {
            let cls = 'dc-option';
            if (done) {
              if (oi === task.correct) cls += ' dc-opt-correct';
              else if (answers[i] === oi && oi !== task.correct) cls += ' dc-opt-wrong';
            } else if (answers[i] === oi) cls += ' dc-opt-selected';
            return `<label class="${cls}"><input type="radio" name="dc-q${i}" ${done ? 'disabled' : ''} ${answers[i] === oi ? 'checked' : ''} onchange="dcState.answers[${i}]=${oi}"> ${escapeHtml(opt)}</label>`;
          }).join('')}
          ${!done ? `<button class="en-btn en-btn-sm en-btn-primary" onclick="checkDCTask(${i})">Kiểm tra</button>` : ''}`;
      } else if (task.skill === 'writing') {
        taskHTML = `
          <div class="dc-task-instruction">${escapeHtml(task.instruction || 'Viết câu tiếng Anh')}</div>
          <div class="dc-task-prompt">${escapeHtml(task.prompt_vi || '')}</div>
          <textarea class="en-input dc-textarea" id="dc-ans-${i}" placeholder="Viết câu tiếng Anh..." rows="2" ${done ? 'disabled' : ''} oninput="dcState.answers[${i}]=this.value">${answers[i] || ''}</textarea>
          ${task.keywords ? `<div class="dc-keywords">Gợi ý: ${task.keywords.map(k => `<span class="dc-keyword">${escapeHtml(k)}</span>`).join(' ')}</div>` : ''}
          ${!done ? `<button class="en-btn en-btn-sm en-btn-primary" onclick="checkDCTask(${i})">Kiểm tra</button>` : ''}`;
      } else if (task.skill === 'grammar') {
        taskHTML = `
          <div class="dc-task-instruction">${escapeHtml(task.instruction || 'Chọn đáp án đúng')}</div>
          <div class="dc-task-question">${escapeHtml(task.question || '')}</div>
          ${(task.options || []).map((opt, oi) => {
            let cls = 'dc-option';
            if (done) {
              if (oi === task.correct) cls += ' dc-opt-correct';
              else if (answers[i] === oi && oi !== task.correct) cls += ' dc-opt-wrong';
            } else if (answers[i] === oi) cls += ' dc-opt-selected';
            return `<label class="${cls}"><input type="radio" name="dc-q${i}" ${done ? 'disabled' : ''} ${answers[i] === oi ? 'checked' : ''} onchange="dcState.answers[${i}]=${oi}"> ${escapeHtml(opt)}</label>`;
          }).join('')}
          ${!done ? `<button class="en-btn en-btn-sm en-btn-primary" onclick="checkDCTask(${i})">Kiểm tra</button>` : ''}`;
      }

      // Feedback if done
      if (done) {
        const res = taskResults[i];
        taskHTML += `<div class="dc-task-feedback ${res.correct ? 'dc-fb-correct' : 'dc-fb-wrong'}">
          ${res.correct ? '✅ Đúng!' : '❌ Sai!'}
          ${res.explain ? ` — ${escapeHtml(res.explain)}` : ''}
          <span class="dc-task-xp">+${res.xp} XP</span>
        </div>`;
      }

      return `<div class="dc-task ${done ? (taskResults[i].correct ? 'dc-task-done-correct' : 'dc-task-done-wrong') : ''}">
        <div class="dc-task-header">
          <span class="dc-task-icon">${task.icon || '📝'}</span>
          <span class="dc-task-skill">${task.skill === 'listening' ? 'Nghe' : task.skill === 'reading' ? 'Đọc' : task.skill === 'writing' ? 'Viết' : 'Ngữ pháp'}</span>
          <span class="dc-task-xp-badge">${task.xp || 25} XP</span>
        </div>
        <div class="dc-task-body">${taskHTML}</div>
      </div>`;
    }).join('')}`;

  // Check if all tasks done
  const allDone = data.tasks.every((_, i) => taskResults[i] !== undefined);
  if (allDone && !submitted) {
    finishDailyChallenge();
  }
}

function dcPlayAudio(taskIndex) {
  if (!dcState) return;
  const task = dcState.data.tasks[taskIndex];
  if (task && task.sentence && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(task.sentence);
    u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.speak(u);
  }
}

async function checkDCTask(taskIndex) {
  if (!dcState) return;
  const task = dcState.data.tasks[taskIndex];
  const answer = dcState.answers[taskIndex];
  let correct = false;
  let explain = '';

  if (task.skill === 'listening') {
    correct = (answer || '').trim().toLowerCase() === (task.answer || '').trim().toLowerCase();
    explain = correct ? '' : `Đáp án: ${task.answer}`;
  } else if (task.skill === 'reading' || task.skill === 'grammar') {
    correct = answer === task.correct;
    explain = task.explain || '';
  } else if (task.skill === 'writing') {
    // AI grade writing task
    const text = (answer || '').trim();
    if (text.length < 3) {
      correct = false;
      explain = 'Câu trả lời quá ngắn';
    } else {
      try {
        const res = await fetch('/api/ai/grade-exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercises: [{ type: 'translation', question: task.prompt_vi || task.instruction || '', answer: task.sampleAnswer || '', topic: 'writing' }],
            userAnswers: [text],
            difficulty: document.getElementById('dc-level')?.value || 'intermediate'
          })
        });
        const grading = await res.json();
        if (grading.results && grading.results[0]) {
          const r = grading.results[0];
          correct = r.isCorrect;
          const parts = [];
          if (r.errorDetail) parts.push(r.errorDetail);
          if (r.knowledgePoint) parts.push('📚 ' + r.knowledgePoint);
          if (r.tip) parts.push('💡 ' + r.tip);
          explain = r.isCorrect
            ? (r.explanation || 'Tốt lắm!')
            : parts.join(' | ');
          if (!correct && task.sampleAnswer) explain += ` — Mẫu: ${task.sampleAnswer}`;
        } else {
          const keywords = task.keywords || [];
          const matched = keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
          correct = matched.length >= Math.ceil(keywords.length / 2) && text.length > 5;
          explain = `Mẫu: ${task.sampleAnswer || ''}`;
        }
      } catch (e) {
        const keywords = task.keywords || [];
        const matched = keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
        correct = matched.length >= Math.ceil(keywords.length / 2) && text.length > 5;
        explain = `Mẫu: ${task.sampleAnswer || ''}`;
      }
    }
  }

  const xp = correct ? (task.xp || 25) : Math.round((task.xp || 25) * 0.3);
  dcState.taskResults[taskIndex] = { correct, explain, xp };
  addXP(xp, 'daily-challenge');
  renderDailyChallenge();
}

function finishDailyChallenge() {
  dcState.submitted = true;
  const results = dcState.taskResults;
  const correctCount = Object.values(results).filter(r => r.correct).length;
  const totalXP = Object.values(results).reduce((s, r) => s + r.xp, 0);
  const allCorrect = correctCount === dcState.data.tasks.length;

  // Bonus XP
  let bonusXP = 0;
  if (allCorrect && dcState.data.bonusXP) {
    bonusXP = dcState.data.bonusXP;
    addXP(bonusXP, 'daily-challenge-bonus');
  }

  // Save completion
  localStorage.setItem(getDCKey(), JSON.stringify({ completed: true, xpEarned: totalXP + bonusXP, correctCount }));

  // Update streak
  const today = new Date().toISOString().slice(0, 10);
  const streakData = JSON.parse(localStorage.getItem('dc_streak') || '{"count":0,"lastDate":""}');
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (streakData.lastDate === yesterday || streakData.lastDate === today) {
    if (streakData.lastDate !== today) streakData.count++;
  } else {
    streakData.count = 1;
  }
  streakData.lastDate = today;
  localStorage.setItem('dc_streak', JSON.stringify(streakData));

  document.getElementById('dc-streak-badge').textContent = `🔥 ${streakData.count} ngày liên tiếp`;

  const resultEl = document.getElementById('dc-result');
  resultEl.style.display = '';
  resultEl.innerHTML = `
    <div class="dc-result-box">
      <div class="dc-result-icon">${allCorrect ? '🎉' : '👍'}</div>
      <h3>${allCorrect ? 'Hoàn hảo!' : 'Hoàn thành thử thách!'}</h3>
      <div class="dc-result-stats">
        <span>✅ ${correctCount}/${dcState.data.tasks.length} đúng</span>
        <span>🏆 +${totalXP} XP</span>
        ${bonusXP ? `<span>🌟 Bonus: +${bonusXP} XP</span>` : ''}
      </div>
      ${dcState.data.motivational ? `<div class="dc-motivational">${escapeHtml(dcState.data.motivational)}</div>` : ''}
    </div>`;

  loadDCStatus();
}

// ==================== LEVEL / XP SYSTEM ====================
const XP_LEVELS = [
  { level: 1, xpNeeded: 0, title: 'Newbie', badge: '🌱' },
  { level: 2, xpNeeded: 100, title: 'Learner', badge: '📗' },
  { level: 3, xpNeeded: 250, title: 'Student', badge: '📘' },
  { level: 4, xpNeeded: 500, title: 'Explorer', badge: '🧭' },
  { level: 5, xpNeeded: 800, title: 'Achiever', badge: '⭐' },
  { level: 6, xpNeeded: 1200, title: 'Scholar', badge: '🎓' },
  { level: 7, xpNeeded: 1800, title: 'Expert', badge: '💎' },
  { level: 8, xpNeeded: 2500, title: 'Master', badge: '🏆' },
  { level: 9, xpNeeded: 3500, title: 'Champion', badge: '👑' },
  { level: 10, xpNeeded: 5000, title: 'Legend', badge: '🔥' }
];

const BADGES = [
  { id: 'first_lesson', name: 'Bài học đầu tiên', icon: '📚', condition: (s) => s.lessonsCompleted >= 1 },
  { id: 'vocab_50', name: '50 từ vựng', icon: '📖', condition: (s) => s.vocabCount >= 50 },
  { id: 'vocab_100', name: '100 từ vựng', icon: '📕', condition: (s) => s.vocabCount >= 100 },
  { id: 'streak_7', name: '7 ngày streak', icon: '🔥', condition: (s) => s.streak >= 7 },
  { id: 'streak_30', name: '30 ngày streak', icon: '💪', condition: (s) => s.streak >= 30 },
  { id: 'listening_5', name: '5 bài nghe', icon: '🎧', condition: (s) => s.listeningDone >= 5 },
  { id: 'reading_5', name: '5 bài đọc', icon: '📖', condition: (s) => s.readingDone >= 5 },
  { id: 'dc_7', name: '7 thử thách', icon: '🎯', condition: (s) => s.challengesDone >= 7 },
  { id: 'xp_1000', name: '1000 XP', icon: '🌟', condition: (s) => s.totalXP >= 1000 },
  { id: 'xp_5000', name: '5000 XP', icon: '💫', condition: (s) => s.totalXP >= 5000 }
];

function getXPData() {
  return JSON.parse(localStorage.getItem('en_xp_data') || '{"totalXP":0,"history":[],"stats":{"lessonsCompleted":0,"vocabCount":0,"streak":0,"listeningDone":0,"readingDone":0,"challengesDone":0},"badges":[]}');
}

function saveXPData(data) {
  localStorage.setItem('en_xp_data', JSON.stringify(data));
}

function getCurrentLevel(xp) {
  let lvl = XP_LEVELS[0];
  for (const l of XP_LEVELS) {
    if (xp >= l.xpNeeded) lvl = l;
    else break;
  }
  return lvl;
}

function getNextLevel(xp) {
  for (const l of XP_LEVELS) {
    if (xp < l.xpNeeded) return l;
  }
  return null;
}

function addXP(amount, source = 'other') {
  if (amount <= 0) return;
  const data = getXPData();
  const oldLevel = getCurrentLevel(data.totalXP);
  data.totalXP += amount;
  data.history.push({ amount, source, date: new Date().toISOString() });
  if (data.history.length > 200) data.history = data.history.slice(-200);

  // Update stats
  if (source === 'listening') data.stats.listeningDone = (data.stats.listeningDone || 0) + 1;
  if (source === 'reading') data.stats.readingDone = (data.stats.readingDone || 0) + 1;
  if (source === 'daily-challenge' || source === 'daily-challenge-bonus') data.stats.challengesDone = (data.stats.challengesDone || 0) + 1;
  data.stats.vocabCount = vocabList.length;
  data.stats.lessonsCompleted = Object.keys(progressData).length;
  data.stats.totalXP = data.totalXP;

  // Streak from localStorage
  const streakData = JSON.parse(localStorage.getItem('dc_streak') || '{"count":0}');
  data.stats.streak = streakData.count || 0;

  // Check badges
  BADGES.forEach(badge => {
    if (!data.badges.includes(badge.id) && badge.condition(data.stats)) {
      data.badges.push(badge.id);
      showBadgeNotification(badge);
    }
  });

  const newLevel = getCurrentLevel(data.totalXP);
  saveXPData(data);
  updateXPDisplay();

  // Level up notification
  if (newLevel.level > oldLevel.level) {
    showLevelUpNotification(newLevel);
  }
}

function updateXPDisplay() {
  const data = getXPData();
  const currentLvl = getCurrentLevel(data.totalXP);
  const nextLvl = getNextLevel(data.totalXP);

  // Header stats
  document.getElementById('stat-xp').textContent = data.totalXP;
  document.getElementById('stat-level').textContent = `Lv.${currentLvl.level}`;

  // XP bar
  const xpInLevel = data.totalXP - currentLvl.xpNeeded;
  const xpForNext = nextLvl ? (nextLvl.xpNeeded - currentLvl.xpNeeded) : 1;
  const pct = nextLvl ? Math.min(Math.round((xpInLevel / xpForNext) * 100), 100) : 100;

  const barInner = document.getElementById('xp-bar-inner');
  if (barInner) barInner.style.width = pct + '%';

  const levelText = document.getElementById('xp-level-text');
  if (levelText) levelText.textContent = `${currentLvl.badge} Level ${currentLvl.level} — ${currentLvl.title}`;

  const progressText = document.getElementById('xp-progress-text');
  if (progressText) {
    progressText.textContent = nextLvl ? `${xpInLevel} / ${xpForNext} XP → Level ${nextLvl.level}` : 'MAX LEVEL!';
  }

  // Badges
  const badgesEl = document.getElementById('xp-badges');
  if (badgesEl) {
    badgesEl.innerHTML = BADGES.map(b => {
      const earned = data.badges.includes(b.id);
      return `<span class="xp-badge ${earned ? 'earned' : 'locked'}" title="${b.name}">${b.icon}</span>`;
    }).join('');
  }
}

function showLevelUpNotification(lvl) {
  const div = document.createElement('div');
  div.className = 'xp-notification xp-levelup';
  div.innerHTML = `<div class="xp-notif-icon">${lvl.badge}</div><div class="xp-notif-text">Level Up! <strong>Level ${lvl.level}</strong> — ${lvl.title}</div>`;
  document.body.appendChild(div);
  setTimeout(() => div.classList.add('show'), 10);
  setTimeout(() => { div.classList.remove('show'); setTimeout(() => div.remove(), 400); }, 3000);
}

function showBadgeNotification(badge) {
  const div = document.createElement('div');
  div.className = 'xp-notification xp-badge-notif';
  div.innerHTML = `<div class="xp-notif-icon">${badge.icon}</div><div class="xp-notif-text">Huy hiệu mới! <strong>${badge.name}</strong></div>`;
  document.body.appendChild(div);
  setTimeout(() => div.classList.add('show'), 10);
  setTimeout(() => { div.classList.remove('show'); setTimeout(() => div.remove(), 400); }, 3000);
}

// ===== BOOT =====
initApp();
setupFlashcard();
loadDCStatus();
updateXPDisplay();
