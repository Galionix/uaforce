# UA Force — путь к игре и измерения

Дата: 10 сентября 2026. Публичная сборка: `d4a6e300-400b-440f-8698-f76f3666d761`, Cloudflare Pages. Игровые изменения основаны на `e677fcc`; исправлена также совместимость Worker: убран лишний именованный export валидатора, тесты проверяют его через HTTP handler.

## Сделано

- Публичная лёгкая страница https://uaforce.thedimas.com/tiktok. На мобильном 390×844 проверены переносы текста и кнопки; на ПК — запуск и копирование. Сенсорное управление не обещается. Метка TikTok сохраняется в ссылке на игру.
- Cloudflare Web Analytics включена. Production HTML загружает официальный beacon. Бесплатный тариф не менялся.
- `GAME_EVENTS` → Analytics Engine `uaforce_events`; сервис активирован на аккаунте. `/api/events` получает только фиксированные поля/категории. Проверено не только HTTP 204: SQL Studio вернул записанные landing_view, link_copy, play_click, load_ready и mission_start с traffic=qa. После кооп-проверки записаны coop_attempt(host), coop_connected(host/guest) и mission_start(host).
- Исправлена потеря коротких гостевых нажатий между render/network ticks: interact, jump, special, ultimate и fire накапливаются до отправки и выдаются один раз. Это особенно важно для бочки и пятюни. Одиночная симуляция не переписана.
- Три TikTok-клипа с текущим игровым звуком, готовые подписи и инструкция: `marketing/TIKTOK_PUBLICATION_2026-09-10.md`. Instagram не трогали. Подписка Google истекла; новых музыкальных генераций и покупок нет.

## Где смотреть

- [Посещения сайта](https://dash.cloudflare.com/b88646f7d4a59213df05e976d2cbaf5d/web-analytics/overview?siteTag~in=8af73000c85849e180b17da86b71b881)
- [Игровые события / SQL Studio](https://dash.cloudflare.com/b88646f7d4a59213df05e976d2cbaf5d/workers/analytics-engine/studio)
- [Отчёты игроков Tally](https://tally.so/forms/b5pMz7/submissions); публичная форма https://tally.so/r/b5pMz7. Предыдущая проверка нашла только собственный QA-отчёт, не реального игрока.

В SQL Studio выбрать таблицу `uaforce_events`, вставить запрос и нажать Run. Для внешнего трафика обязательно `blob6='public'`; наши проверки с `qa=1` исключены. Обычная Web Analytics при этом может учитывать сами тестовые просмотры страницы — это другой набор данных.

```sql
SELECT blob1 AS event, blob2 AS source, blob3 AS mode,
       SUM(_sample_interval) AS events
FROM uaforce_events
WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob6='public'
GROUP BY blob1, blob2, blob3
```

Продолжительность завершённых попыток по миссиям (игровые секунды, без паузы):

```sql
SELECT double1 AS mission, blob1 AS outcome,
       SUM(_sample_interval) AS runs,
       SUM(double2 * _sample_interval) / SUM(_sample_interval) AS mean_seconds
FROM uaforce_events
WHERE timestamp > NOW() - INTERVAL '7' DAY
  AND blob6='public' AND blob1 IN ('mission_win','mission_loss','mission_leave')
GROUP BY double1, blob1
```

Схема: blob1 event, blob2 source, blob3 mode, blob4 build, blob5 случайный ID одной открытой страницы, blob6 qa/public; double1 номер миссии (0-based, -1 вне миссии), double2 игровые секунды. Источники: direct/tiktok/youtube/reddit/threads/friend/playtest/qa. События: landing_view/play_click/link_copy/load_ready/load_error/mission_start/mission_win/mission_loss/mission_leave/coop_attempt/coop_connected/coop_error/coop_leave/feedback_open/playtest_open.

## Что эти числа не доказывают

- ID не сохраняется между открытиями, страницами, устройствами. Нельзя вычислять retention людей или точную сквозную воронку по уникальным пользователям. Переход телефон → ПК не связывается, но ссылка сохраняет категорию источника.
- Coop attempt/connected считаются на клиентах, не на комнатах; host и guest — отдельные строки. Это диагностика подключений, не точный счёт пар. coop_error пока включает завершения через callback ended, в том числе уход второго игрока; не трактовать каждое событие как NAT-сбой.
- Analytics Engine применил сэмплирование даже в малом QA-наборе: у некоторых строк `_sample_interval=2`. Поэтому SUM(_sample_interval) — оценка, не точный счёт; отсутствующая редкая категория в маленькой выборке не доказывает отсутствие события. Не использовать эти числа для точной поштучной воронки или выводов по одному тестеру.
- Доставка best-effort: браузер может блокировать аналитику или закрыться до отправки. Нет событий за время до этого релиза. Возврат HTTP 204 дополнительно подтверждён чтением сохранённых QA-строк.
- Заголовки/IP используются платформой и кратковременно в памяти для rate limit, но не записываются в наши игровые события. Комнатные коды, URL, произвольные ошибки, переписка, email и скриншоты не сохраняются. Нет постоянного cookie/player ID. `analytics=off`, DNT и обычный `silent=1` отключают игровые события; `silent=1&qa=1` специально разрешает QA-проверку. Это не выключатель платформенного Web Analytics beacon.
- Лимит 120 событий на страницу, пакеты до12, запрос до8KB, best-effort rate limit24 запросов/мин на IP/изолятор. Эти меры не являются глобальной защитой от злоупотребления и не гарантируют вместимость бесплатного тарифа при любом трафике.

Cloudflare Free: 100000 datapoints/день и 10000 read queries/день по [текущей справке](https://developers.cloudflare.com/analytics/analytics-engine/pricing/). Не включали платный тариф. В запросах учитывается `_sample_interval`: [SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/). Web Analytics Pages вступает в силу после деплоя: [справка](https://developers.cloudflare.com/pages/how-to/web-analytics/).

## Проверки и оставшееся

- Полный набор 311/311 тестов прошёл; после изменения Worker повторены 5 относящихся к нему growth-тестов. TypeScript и release build прошли:109 файлов,71.02MiB. Локальный workerd запускался через Wrangler, без входа в аккаунт; CLI-сессия остановлена. Публичный SP запущен, пауза открывается, всё без звука. Затем host и guest на основном домене создали комнату, соединились и показали одну миссию с одинаковым временем. Ошибок в console error не было; проверка на одном Mac, без утверждения о независимых сетях.
- Две ранние попытки Pages завершились failure, хотя экран upload говорил Success. Активация Analytics Engine сама по себе не устранила сбой. После создания набора и удаления лишнего именованного export деплой d4a6e300 стал Production; точный текст серверной ошибки старых попыток панель не показала. Не приписываем доказанную причину только одному изменению.
- Внешние плейтесты ещё нужны; подготовлены приглашение и пустой PLAYTEST_TRACKER.csv. Не считать постановочную запись доказательством стабильности на разных сетях. Дальнейшую полировку выбирать по конкретным записям/шагам игроков.
- YouTube: одноразовая верификация владельца в Studio остаётся необходимой для кликабельных внешних ссылок. URL уже указан; агент не может заменить личную проверку владельца. Точный вход: https://studio.youtube.com/video/PKP5ShZ28uw/edit → сообщение о one-time verification → пройти доступный способ лично.
- TikTok файлы публикует владелец. В этом проходе постов и сообщений другим людям не отправляли, новых героев/уровней не добавляли.
