// 시연용 샘플 데이터 (모든 작품·창작자·수치는 가상)
import { parseScript } from './util.js';
import AUDIO_CUES from './audio-cues.json' with { type: 'json' };

export const CATEGORIES = [{
        id: `comic`,
        short: `코믹`,
        name: `코믹`,
        desc: `웃긴 경험, 황당한 일, 실수, 흑역사`,
        hue: 28
    }, {
        id: `horror`,
        short: `공포`,
        name: `공포·미스터리`,
        desc: `괴담, 기묘한 경험, 창작 공포`,
        hue: 265
    }, {
        id: `love`,
        short: `연애`,
        name: `연애·관계`,
        desc: `짝사랑, 썸, 연애, 이별, 친구 관계`,
        hue: 345
    }, {
        id: `daily`,
        short: `일상`,
        name: `일상·공감`,
        desc: `직장, 학교, 가족, 육아, 자취`,
        hue: 205
    }, {
        id: `warm`,
        short: `감동`,
        name: `감동·위로`,
        desc: `따뜻한 사연, 감사, 위로와 응원`,
        hue: 38
    }, {
        id: `motivation`,
        short: `동기`,
        name: `동기부여`,
        desc: `운동, 도전, 자신감, 새로운 시작`,
        hue: 150
    }, {
        id: `life`,
        short: `인생`,
        name: `인생·경험`,
        desc: `인생 이야기, 여행, 실패와 회복`,
        hue: 185
    }, {
        id: `music`,
        short: `음악`,
        name: `음악·감성`,
        desc: `음악에 얽힌 사연, 자작곡, 시, 감성 낭독`,
        hue: 300
    }, {
        id: `drama`,
        short: `드라마`,
        name: `창작·드라마`,
        desc: `직접 만든 이야기, 상황극, 판타지, 연재물`,
        hue: 230
    }];

export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export const CREATORS = [{
        id: `c-dahee`,
        name: `이다희`,
        handle: `dahee_night`,
        intro: `자기 전에 조용히 읽어 드리는 이야기. 출퇴근길 짧은 위로도 올려요.`,
        subscriberBase: 1240,
        joinedAt: `2026-06-02`,
        featuredWorkId: `w-mom-dahee`,
        hue: 38
    }, {
        id: `c-mango`,
        name: `망고형`,
        handle: `mango_hyung`,
        intro: `회사에서 겪은 황당한 일들. 실화 90%, 과장 10%.`,
        subscriberBase: 870,
        joinedAt: `2026-07-14`,
        featuredWorkId: `w-intern-mango`,
        hue: 28
    }, {
        id: `c-eunho`,
        name: `은호`,
        handle: `eunho_story`,
        intro: `창작 공포 연재 중. 잠들기 전에는 듣지 마세요.`,
        subscriberBase: 2310,
        joinedAt: `2026-05-20`,
        featuredWorkId: `w-402-1`,
        hue: 265
    }, {
        id: `c-sol`,
        name: `솔`,
        handle: `sol_runs`,
        intro: `러닝 3년 차. 운동 나가기 전 30초, 제가 등 떠밀어 드려요.`,
        subscriberBase: 410,
        joinedAt: `2026-08-01`,
        featuredWorkId: `w-fail-sol`,
        hue: 150
    }, {
        id: `c-haram`,
        name: `하람`,
        handle: `haram_acoustic`,
        intro: `기타 두 달 차. 직접 만든 노래와 그 노래가 생긴 사연.`,
        subscriberBase: 150,
        joinedAt: `2026-09-10`,
        featuredWorkId: `w-song-haram`,
        hue: 300
    }, {
        id: `c-yeonwoo`,
        name: `연우`,
        handle: `yeonwoo_drama`,
        intro: `짧은 오디오 드라마를 씁니다. 연재는 매주 금요일.`,
        subscriberBase: 3020,
        joinedAt: `2026-04-11`,
        featuredWorkId: `w-lighthouse-1`,
        hue: 230
    }, {
        id: `c-jin`,
        name: `진`,
        handle: `jin_seoul`,
        intro: `회사 그만두고 걸어 다니며 배운 것들.`,
        subscriberBase: 95,
        joinedAt: `2026-10-05`,
        featuredWorkId: `w-jeju-jin`,
        hue: 185
    }, {
        id: `c-boram`,
        name: `보람`,
        handle: `boram_log`,
        intro: `연애와 우정 사이에서 배운 작은 것들을 기록해요.`,
        subscriberBase: 530,
        joinedAt: `2026-07-30`,
        featuredWorkId: `w-friend-boram`,
        hue: 345
    }, {
        id: `c-chorok`,
        name: `초록`,
        handle: `chorok_new`,
        intro: `자취 1일 차. 오늘 처음 올려 봐요.`,
        subscriberBase: 12,
        joinedAt: `2026-10-30`,
        isNew: true,
        featuredWorkId: `w-rice-chorok`,
        hue: 120
    }];

export const CREATOR = Object.fromEntries(CREATORS.map((c) => [c.id, c]));

function O(validListens, completions, previewListens, likes, saves, shares, comments, newSubscribers, purchases) {
  return { validListens, completions, previewListens, likes, saves, shares, comments, newSubscribers, purchases };
}

export const WORKS = [{
        id: `w-coffee-mango`,
        cover: { kind: 'image', url: 'covers/w-coffee-mango.jpg' },
        creatorId: `c-mango`,
        title: `부장님이 "알아서"라고 했다. 나는 제일 비싼 걸 샀다`,
        intro: `월요일 아침 커피 심부름. 정답은 없고 눈치만 있었다.`,
        category: `comic`,
        tags: [`직장인`, `출근길`, `30초썰`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `m30`,
        cast: { 부장님: 'm50' },
        paid: false,
        publishedAt: `2026-11-02T08:10:00+09:00`,
        stats: {
            week: O(1820, 1610, 0, 240, 61, 38, 19, 24, 0),
            month: O(4100, 3590, 0, 520, 140, 90, 41, 70, 0)
        },
        script: `월요일 아침 여덟 시 오십 분. 부장님이 카드를 내밀었어요.\n부장님: 아메리카노 다섯, 라떼 둘. 내 건 알아서.\n알아서. 알아서가 뭐예요, 알아서가.\n카페 줄에서 오 분을 고민하다 제일 비싼 걸 찍었어요.\n부장님이 한 모금 마시고 저를 봤어요.\n부장님: 자네, 눈치 있구만.\n그날부터 저는 커피 담당입니다.`
    }, {
        id: `w-alarm-mango`,
        cover: { kind: 'image', url: 'covers/w-alarm-mango.jpg' },
        creatorId: `c-mango`,
        title: `수능 전날, 알람 다섯 개를 전부 오후로 맞췄다`,
        intro: `새벽에 눈이 떠진 건 알람이 아니라 엄마였다.`,
        category: `comic`,
        tags: [`흑역사`, `학교썰`, `30초썰`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `m20`,
        cast: { 엄마: 'w50' },
        paid: false,
        publishedAt: `2026-10-29T21:00:00+09:00`,
        stats: {
            week: O(960, 870, 0, 130, 22, 15, 8, 9, 0),
            month: O(2900, 2600, 0, 390, 80, 44, 22, 31, 0)
        },
        script: `수능 전날 밤. 알람을 다섯 개 맞췄어요.\n여섯 시, 십 분, 이십 분, 삼십 분, 사십 분. 완벽했죠.\n전부 오후였다는 것만 빼면.\n새벽 여섯 시, 방문이 벌컥 열렸어요.\n엄마: 야! 안 일어나?\n엄마였어요.\n알람 다섯 개는 그날 오후 여섯 시에 차례로 울렸어요. 시험 끝나고 집에 오는 버스 안에서.`
    }, {
        id: `w-bus-dahee`,
        cover: { kind: 'image', url: 'covers/w-bus-dahee.jpg' },
        creatorId: `c-dahee`,
        title: `오늘 하루를 다 버티려고 하지 마요. 점심까지만`,
        intro: `출근 버스 창가에서 떠올린, 긴 하루를 쪼개는 법.`,
        category: `warm`,
        tags: [`출근길`, `위로`, `30초썰`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `w50`,
        paid: false,
        publishedAt: `2026-11-01T07:30:00+09:00`,
        stats: {
            week: O(2400, 2210, 0, 410, 190, 120, 33, 58, 0),
            month: O(5200, 4700, 0, 880, 410, 260, 70, 140, 0)
        },
        script: `출근 버스, 창가 자리.\n오늘은 유난히 길 것 같은 날. 그런 날 있잖아요.\n그럴 땐 하루를 통째로 버티려고 하지 마요.\n점심까지만 가요.\n거기까지 가면, 또 저녁까지만.\n그렇게 가다 보면 어느새 집이에요.\n오늘도 잘 다녀오세요.`
    }, {
        id: `w-run30-sol`,
        cover: { kind: 'image', url: 'covers/w-run30-sol.jpg' },
        creatorId: `c-sol`,
        title: `십 분 뒤에 그만두는 사람, 한 명도 못 봤어요`,
        intro: `운동화 끈 묶는 데 삼십 초. 나가기 싫은 날의 등 떠밀기.`,
        category: `motivation`,
        tags: [`운동전`, `30초썰`, `자신감`],
        origin: `fiction`,
        voice: `own`,
        aiVoiceName: `w20`,
        paid: false,
        publishedAt: `2026-10-31T06:00:00+09:00`,
        stats: {
            week: O(1100, 1040, 0, 210, 150, 60, 14, 31, 0),
            month: O(3300, 3100, 0, 600, 420, 180, 40, 95, 0)
        },
        script: `운동화 끈 묶는 데 삼십 초면 돼요.\n오늘 안 하면 내일도 안 해요.\n몸 무겁죠? 당연해요. 어제도 무거웠으니까.\n딱 십 분만 하고 그만둔다고 생각해요.\n십 분 뒤에 그만두는 사람, 제가 삼 년 동안 한 명도 못 봤어요.\n자, 끈 묶었죠? 문 열어요.`
    }, {
        id: `w-breath-sol`,
        cover: { kind: 'image', url: 'covers/w-breath-sol.jpg' },
        creatorId: `c-sol`,
        title: `이불 속에서 하는 운동이 하나 있어요`,
        intro: `자기 전 숨 세 번. 내일의 나를 위해.`,
        category: `motivation`,
        tags: [`자기전`, `새벽감성`, `30초썰`],
        origin: `fiction`,
        voice: `own`,
        aiVoiceName: `whisper`,
        paid: false,
        publishedAt: `2026-10-27T23:30:00+09:00`,
        stats: {
            week: O(700, 660, 0, 120, 160, 20, 6, 12, 0),
            month: O(2100, 1990, 0, 350, 480, 60, 18, 36, 0)
        },
        script: `오늘 하루, 잘 버텼어요.\n이불 속에서 할 수 있는 운동이 하나 있어요.\n넷까지 세면서 들이쉬고. 일곱까지 참고. 여덟까지 내쉬어요.\n세 번만.\n내일의 나는 오늘의 나보다 조금 더 쉬어 있을 거예요.\n잘 자요.`
    }, {
        id: `w-elevator-boram`,
        cover: { kind: 'image', url: 'covers/w-elevator-boram.jpg' },
        creatorId: `c-boram`,
        title: `"오늘 저녁 시간 있으세요?" 다음 말이 문제였다`,
        intro: `매일 엘리베이터에서 마주친 그 사람이 드디어 말을 걸었다.`,
        category: `love`,
        tags: [`썸`, `30초썰`, `반전`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `w20`,
        cast: { 그분: 'm30' },
        paid: false,
        publishedAt: `2026-10-30T19:00:00+09:00`,
        stats: {
            week: O(1500, 1390, 0, 260, 40, 70, 25, 20, 0),
            month: O(3600, 3300, 0, 610, 110, 170, 58, 52, 0)
        },
        script: `같은 층 다른 회사 사람. 매일 아침 엘리베이터에서 마주쳤어요.\n어느 날 그 사람이 저를 보며 말했어요.\n그분: 혹시 오늘 저녁에 시간 있으세요?\n심장이 쿵. 머릿속으로 옷장을 넘기고 있는데, 다음 말이 왔어요.\n그분: 저희 팀 회식인데 자리가 모자라서요.\n네. 저는 그날 남의 팀 회식에서 고기를 구웠습니다.`
    }, {
        id: `w-rice-chorok`,
        cover: { kind: 'image', url: 'covers/w-rice-chorok.jpg' },
        creatorId: `c-chorok`,
        title: `밥솥은 샀는데 쌀을 안 샀다`,
        intro: `자취 첫날, 밥솥과 눈이 마주쳤다.`,
        category: `daily`,
        tags: [`자취`, `첫게시`, `30초썰`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `m20`,
        paid: false,
        publishedAt: `2026-11-02T20:45:00+09:00`,
        stats: {
            week: O(40, 37, 0, 9, 2, 1, 3, 5, 0),
            month: O(40, 37, 0, 9, 2, 1, 3, 5, 0)
        },
        script: `자취 첫날. 박스를 다 풀고 밥솥을 꺼냈어요. 번쩍번쩍.\n뚜껑을 열고, 쌀통을 찾았어요.\n없어요. 쌀을 안 샀어요.\n편의점 햇반을 먹으면서 밥솥을 봤어요.\n밥솥도 저를 봤어요.\n다음 날 쌀을 샀습니다. 첫 이야기 끝. 들어 주셔서 고마워요.`
    }, {
        id: `w-intern-mango`,
        cover: { kind: 'image', url: 'covers/w-intern-mango.jpg' },
        creatorId: `c-mango`,
        title: `임원 단톡방에 "아 진짜 가기 싫다"를 보냈다`,
        intro: `인턴 첫날. 읽음 표시가 하나씩 올라갔고, 삭제는 늦었다.`,
        category: `comic`,
        tags: [`직장인`, `흑역사`, `반전`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `m30`,
        cast: { 팀장님: 'm50', 신입: 'm20' },
        paid: false,
        publishedAt: `2026-10-25T12:00:00+09:00`,
        stats: {
            week: O(2100, 1500, 0, 480, 120, 210, 64, 90, 0),
            month: O(6800, 4900, 0, 1500, 390, 640, 190, 260, 0)
        },
        script: `인턴 첫날, 오전 열한 시 사십 분.\n회사 메신저에 팀장님 메시지가 떴어요.\n팀장님: 다들 점심 뭐 먹을래요?\n저는 친구한테 보내던 손가락 그대로 쳤어요.\n"아 몰라 대충 아무거나. 근데 나 오늘 진짜 가기 싫다."\n전송.\n\n삼 초 뒤에 깨달았어요. 전체방이었어요. 임원분들도 계신 방.\n읽음 1. 읽음 4. 읽음 11.\n심장이 발밑까지 내려가더라고요.\n삭제를 눌렀는데, 그 메신저는 "삭제된 메시지입니다"가 남는 종류였어요. 더 수상해졌죠.\n\n그날 점심은 팀장님이 사 주셨어요.\n국밥을 떠 주시면서 한마디 하셨어요.\n팀장님: 첫날은 다 그래.\n저를 불쌍하게 보신 것 같았어요.\n\n그런데 반전이 있어요.\n삼 년 뒤, 제가 그 팀 팀장이 됐을 때 신입이 똑같은 걸 보냈어요.\n신입: 아 진짜 가기 싫다.\n저는 아무 말 없이 국밥을 샀습니다.\n전통은 그렇게 이어지는 거더라고요.`
    }, {
        id: `w-lastbus-dahee`,
        cover: { kind: 'image', url: 'covers/w-lastbus-dahee.jpg' },
        creatorId: `c-dahee`,
        title: `막차가 눈앞에서 떠났다. 그래서 오십 분을 걸었다`,
        intro: `야근 끝 밤 열한 시 반, 택시 대신 걷기로 한 이유.`,
        category: `daily`,
        tags: [`퇴근길`, `자취`, `위로`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `w30`,
        cast: { 할아버지: 'm70' },
        paid: false,
        publishedAt: `2026-10-28T23:10:00+09:00`,
        stats: {
            week: O(1700, 1300, 0, 390, 260, 90, 41, 66, 0),
            month: O(4300, 3200, 0, 980, 640, 210, 95, 150, 0)
        },
        script: `밤 열한 시 반. 정류장에 도착하는 순간, 막차 꼬리등이 멀어지고 있었어요.\n손을 흔들었어요. 기사님은 못 봤어요.\n저는 그 자리에 한참 서 있었어요.\n\n택시 앱을 켰다가, 닫았어요. 그냥 걷기로 했어요.\n집까지 오십 분.\n편의점에서 삼각김밥 하나를 사서 걸으면서 먹었어요.\n\n이상하게 그날 밤공기가 좋았어요.\n매일 버스로 지나던 길인데, 걸어 보니 다른 동네 같았어요.\n문 닫은 꽃집. 아직 불이 켜진 세탁소. 강아지를 산책시키는 할아버지.\n할아버지: 늦었네.\n할아버지가 저한테 그러셨어요. 저는 웃었어요.\n\n집에 도착하니 열두 시 반.\n그런데 하루 중에 그 오십 분이 제일 제 시간 같았어요.\n혹시 오늘 뭔가를 놓치셨다면, 그 덕분에 생긴 시간이 있을지도 몰라요.\n자취 삼 년 차가 전해 드리는 작은 위로였어요.`
    }, {
        id: `w-fail-sol`,
        cover: { kind: 'image', url: 'covers/w-fail-sol.jpg' },
        creatorId: `c-sol`,
        title: `8km에서 기권했다. 집에 와서 기록을 보고 울었다`,
        intro: `두 달 전엔 3km도 못 뛰던 사람의 첫 10km 대회.`,
        category: `motivation`,
        tags: [`도전`, `러닝`, `새로운시작`],
        origin: `true`,
        voice: `own`,
        aiVoiceName: `w20`,
        paid: false,
        publishedAt: `2026-10-22T07:00:00+09:00`,
        stats: {
            week: O(800, 610, 0, 200, 140, 50, 22, 28, 0),
            month: O(2700, 2e3, 0, 640, 430, 150, 60, 88, 0)
        },
        script: `첫 십 킬로 대회. 육 킬로 지점에서 다리가 풀렸어요.\n걷다가, 뛰다가, 걷다가. 팔 킬로에서 손을 들었어요. 기권.\n버스를 타고 집에 오는데 메달 없는 목이 자꾸 신경 쓰였어요.\n옆자리 아저씨는 메달을 목에 걸고 자고 있었어요.\n\n집에 와서 시계를 봤어요.\n팔 킬로, 오십이 분.\n두 달 전에 삼 킬로 뛰고 벤치에 주저앉았던 사람이요.\n그 숫자를 보고 좀 울었어요. 창피해서가 아니라.\n\n완주를 못 한 건 맞아요. 하지만 실패한 건 아니었어요.\n다음 대회에서는 완주했어요. 느렸지만, 끝까지 갔어요.\n혹시 지금 중간에 멈춘 게 있다면, 거기까지 간 거리를 한번 재 보세요.\n생각보다 멀리 왔을 거예요.`
    }, {
        id: `w-friend-boram`,
        cover: { kind: 'image', url: 'covers/w-friend-boram.jpg' },
        creatorId: `c-boram`,
        title: `십 년 친구와 싸우지도 않고 멀어졌다`,
        intro: `둘 다 상대가 먼저 손 내밀기를 기다렸을 뿐이었다.`,
        category: `love`,
        tags: [`이별`, `친구`, `관계`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `w30`,
        cast: { 친구: 'w20' },
        paid: false,
        publishedAt: `2026-10-20T21:30:00+09:00`,
        stats: {
            week: O(900, 700, 0, 230, 170, 80, 37, 25, 0),
            month: O(3900, 3e3, 0, 1100, 720, 330, 140, 110, 0)
        },
        script: `십 년 친구와 멀어졌어요. 큰 싸움은 없었어요.\n어느 순간부터 제가 먼저 연락하지 않으면 연락이 오지 않았어요.\n저도 지쳐서 그만뒀어요.\n그렇게 반년.\n\n마트에서 우연히 마주쳤어요. 카트를 밀다가, 둘 다 멈췄어요.\n친구가 먼저 말했어요.\n친구: 네가 바빠 보여서 연락 못 했어.\n저는 그 친구가 저한테 관심이 없어진 줄 알았고,\n그 친구는 제가 자기를 귀찮아하는 줄 알았대요.\n둘 다 상대가 먼저 손 내밀기를 기다렸던 거예요. 반년 동안.\n\n지금은 다시 가끔 만나요.\n예전처럼 매일 연락하진 않지만, 그게 꼭 멀어진 건 아니더라고요.\n혹시 지금 떠오르는 사람이 있다면, 오늘 먼저 연락해 보세요.\n상대도 지금 같은 생각을 하고 있을지 몰라요.`
    }, {
        id: `w-jeju-jin`,
        cover: { kind: 'image', url: 'covers/w-jeju-jin.jpg' },
        creatorId: `c-jin`,
        title: `배터리 3%, 해는 지고, 귤밭 할머니가 손짓했다`,
        intro: `회사를 그만두고 제주에서 길을 잃은 날.`,
        category: `life`,
        tags: [`여행`, `제주`, `인생이야기`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `m30`,
        cast: { 할머니: 'w70' },
        paid: false,
        publishedAt: `2026-10-26T18:00:00+09:00`,
        stats: {
            week: O(420, 330, 0, 110, 90, 30, 18, 40, 0),
            month: O(560, 440, 0, 150, 120, 40, 22, 55, 0)
        },
        script: `회사를 그만두고 제주에 갔어요. 계획은 없었고, 비행기표만 있었어요.\n둘째 날 올레길. 표지판 하나를 놓쳤고, 완전히 길을 잃었어요.\n휴대폰 배터리 삼 퍼센트. 해는 지고 있었어요.\n\n그때 귤밭에서 일하던 할머니가 저를 보고 손짓하셨어요.\n말도 안 했는데 귤 한 봉지를 쥐여 주시고, 트럭에 태우셨어요.\n할머니: 버스 정류장까지 데려다 주께.\n가는 길에 할머니가 물으셨어요.\n할머니: 뭐 하러 혼자 왔어?\n저는 솔직하게 말했어요. 뭘 해야 할지 모르겠어서요.\n할머니는 한참 운전만 하셨어요. 그러다 한마디 하셨어요.\n할머니: 모르면 일단 걸어. 걷다 보면 길이 나와.\n\n그날 이후로 저는 뭔가 막힐 때마다 걸어요.\n지금은 다시 일을 하고 있고, 가끔 제주에 가요.\n할머니 귤밭은 못 찾았어요. 그 말은 아직 가지고 다녀요.`
    }, {
        id: `w-quit-jin`,
        cover: { kind: 'image', url: 'covers/w-quit-jin.jpg' },
        creatorId: `c-jin`,
        title: `서른에 카페를 열고 서른둘에 접었다. 아버지는 한마디만 했다`,
        intro: `"밥은 먹었냐." 폐업 신고 날, 그 말에 무너졌다.`,
        category: `life`,
        tags: [`실패`, `회복`, `서른`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `m30`,
        cast: { 아버지: 'm70' },
        paid: false,
        publishedAt: `2026-11-01T15:00:00+09:00`,
        stats: {
            week: O(310, 240, 0, 80, 70, 20, 12, 30, 0),
            month: O(310, 240, 0, 80, 70, 20, 12, 30, 0)
        },
        script: `서른에 카페를 열었고, 서른둘에 접었어요. 보증금은 거의 다 날렸어요.\n폐업 신고를 하고 구청 계단을 내려오면서, 처음으로 부모님께 전화했어요.\n아버지는 딱 한마디 하셨어요.\n아버지: 밥은 먹었냐.\n그 말에 계단에 앉아서 무너졌어요.\n\n그 뒤로 일 년은 배달을 했어요.\n밤에 오토바이를 타고 다니면서 동네 가게들을 봤어요.\n어디가 줄을 서고, 어디가 비어 가는지. 어떤 메뉴판이 읽히고, 어떤 메뉴판은 안 읽히는지.\n그때 본 게 지금 하는 일의 전부예요.\n\n지금은 작은 가게 메뉴판을 만드는 일을 해요.\n망했던 카페 덕분에, 사장님들이 뭘 힘들어하는지 알거든요.\n돌아보면 그 이 년이 제 인생에서 가장 비싼 수업료였어요.\n비싸긴 했는데, 환불받고 싶진 않아요.`
    }, {
        id: `w-song-haram`,
        cover: { kind: 'image', url: 'covers/w-song-haram.jpg' },
        creatorId: `c-haram`,
        title: `새벽 세 시, 코드 네 개로 할머니 노래를 만들었다`,
        intro: `기타 두 달 차가 한 번에 녹음한 노래와 그 노래가 생긴 이유.`,
        category: `music`,
        tags: [`자작곡`, `새벽감성`, `기타`],
        origin: `true`,
        voice: `own`,
        aiVoiceName: `m20`,
        paid: false,
        publishedAt: `2026-10-24T03:20:00+09:00`,
        stats: {
            week: O(380, 300, 0, 140, 110, 40, 26, 22, 0),
            month: O(1200, 950, 0, 420, 330, 120, 70, 60, 0)
        },
        script: `기타 두 달째, 새벽 세 시. 잠이 안 왔어요.\n코드 네 개를 번갈아 쳤어요. 씨, 지, 에이마이너, 에프. 그게 다였어요.\n그런데 그 위에 흥얼거리다 보니 가사가 붙었어요.\n\n헤어진 사람 얘기가 아니었어요.\n그날 낮에 본 버스 정류장 할머니 얘기였어요.\n비닐봉지를 들고, 버스를 세 대나 그냥 보내시던 모습.\n그 버스가 아니었나 봐요. 아니면, 탈 데가 없었거나.\n\n녹음기를 켜고 한 번에 불렀어요.\n음정은 흔들리고 기타는 틀렸는데, 지우지 못했어요.\n그 노래를 여기 올려요. 제 목소리 그대로예요.\n잘 부르지 못해도 괜찮다면 들어 주세요.\n음악은 직접 만들었고, 다른 사람 곡은 쓰지 않았어요.`
    }, {
        id: `w-mom-dahee`,
        cover: { kind: 'image', url: 'covers/w-mom-dahee.jpg' },
        creatorId: `c-dahee`,
        title: `반찬통 뚜껑에 적힌 한 줄, "밥 안 넘어가면 죽이라도"`,
        intro: `전화는 이 분. 엄마는 그 안에서 다 알았다.`,
        category: `warm`,
        tags: [`가족`, `감사`, `엄마`],
        origin: `true`,
        voice: `ai`,
        aiVoiceName: `w30`,
        cast: { 엄마: 'w50' },
        paid: true,
        priceKRW: 300,
        publishedAt: `2026-10-19T20:00:00+09:00`,
        stats: {
            week: O(640, 560, 1900, 310, 280, 120, 58, 120, 410),
            month: O(2300, 2e3, 6100, 1100, 960, 410, 190, 420, 1500)
        },
        script: `매주 일요일 저녁, 엄마한테서 택배가 와요.\n반찬통 여섯 개가 신문지에 꽁꽁 싸여 있고, 통마다 매직으로 이름이 적혀 있어요.\n멸치볶음. 진미채. 콩자반.\n그리고 꼭 한 통은 제가 어릴 때 좋아하던 계란장조림이에요.\n저는 서른셋이고, 솔직히 계란장조림은 안 좋아한 지 오래됐어요.\n그래도 그 통은 늘 제일 먼저 비워요.\n\n지난달에 회사에서 큰 실수를 했어요.\n거래처에 잘못된 견적을 보냈고, 수습하느라 일주일을 거의 못 잤어요.\n엄마한테는 말하지 않았어요. 걱정하실까 봐요.\n그 주 일요일에 엄마랑 통화를 했어요. 딱 한 번, 이 분.\n"응, 잘 지내. 바빠서. 끊을게."\n\n그런데 그 주 택배는 통이 두 개 더 많았어요.\n하나는 소고기뭇국. 하나는 흰죽.\n흰죽 뚜껑에 이렇게 적혀 있었어요.\n"밥 안 넘어가면 죽이라도."\n저는 아무 말도 안 했는데, 어떻게 아셨을까요.\n전화해서 물어봤더니 엄마가 그러셨어요.\n엄마: 목소리가 평소랑 다르더라.\n이 분. 그 이 분 안에서 엄마는 다 아셨던 거예요.\n\n그날 밤 흰죽을 데워 먹으면서 많이 울었어요.\n다음 날 출근해서 거래처에 다시 전화를 걸었어요. 이상하게 용기가 났어요.\n일은 잘 해결됐고, 담당자분이 오히려 고생 많았다고 해 주셨어요.\n\n이번 주 일요일에는 제가 엄마한테 택배를 보냈어요.\n유자차, 손목 보호대, 그리고 편지 한 장.\n"엄마, 이제 계란장조림은 안 보내도 돼. 근데 글씨는 계속 적어 줘."\n반찬통에 적힌 그 글씨가, 사실은 제가 매주 기다리는 거였거든요.\n혹시 지금 멀리 사는 가족이 있다면, 오늘 짧게라도 전화 한 통 해 보세요.\n목소리만으로도 다 전해지더라고요.`
    }, {
        id: `w-402-1`,
        cover: { kind: 'image', url: 'covers/w-402-1.jpg' },
        creatorId: `c-eunho`,
        title: `402호의 밤 1화 — 비어 있다는 윗집에서 구두 소리가 난다`,
        intro: `이사 첫날 밤, 또각 또각. 경비 아저씨가 말했다. "오백이 호는 비어 있는데."`,
        category: `horror`,
        tags: [`괴담`, `아파트`, `연재`, `자기전`],
        origin: `fiction`,
        voice: `ai`,
        aiVoiceName: `m30`,
        cast: { 경비아저씨: 'm70' },
        paid: false,
        seriesId: `s-402`,
        episodeNo: 1,
        publishedAt: `2026-10-10T22:00:00+09:00`,
        stats: {
            week: O(3100, 2500, 0, 700, 520, 260, 140, 210, 0),
            month: O(12e3, 9800, 0, 2800, 2100, 990, 520, 800, 0)
        },
        script: `이사 온 첫날 밤이었어요.\n오래된 복도식 아파트 사 층, 사백이 호.\n짐 정리를 하다 보니 열두 시. 라면을 끓여 먹고 자리에 누웠어요.\n그런데 천장에서 소리가 났어요.\n또각. 또각.\n구두 소리였어요. 윗집이 늦게 들어왔나 보다, 했죠.\n\n소리가 멈추지 않았어요.\n거실에서 방으로. 방에서 다시 거실로.\n누군가 천천히, 아주 천천히 걸어 다니는 소리.\n한 시. 두 시. 세 시.\n저는 이불 속에서 발소리를 세고 있었어요. 백마흔두 걸음까지 셌어요.\n\n다음 날 아침, 경비실에 갔어요.\n"윗집이 밤에 좀 걸어 다니시는 것 같은데요."\n경비 아저씨가 저를 한참 보셨어요. 그리고 말씀하셨어요.\n경비아저씨: 오백이 호는 비어 있는데.\n삼 년째 비어 있는 집이래요.\n저는 웃었어요. 잘못 들었나 보다고.\n\n그날 밤에도 소리가 났어요.\n또각. 또각.\n이번엔 조금 달랐어요.\n천장이 아니었어요. 현관 쪽이었어요. 저희 집 현관.\n숨을 죽이고 문을 봤어요.\n문 아래 틈으로 복도 불빛이 들어오고 있었는데,\n그 불빛 한가운데가 까맣게 가려져 있었어요.\n누군가, 문 앞에 서 있었어요.\n다음 화에 이어집니다.`
    }, {
        id: `w-402-2`,
        cover: { kind: 'image', url: 'covers/w-402-2.jpg' },
        creatorId: `c-eunho`,
        title: `402호의 밤 2화 — 소리는 집 안에서 나고 있었다`,
        intro: `카메라에는 아무도 없었다. 신발장엔 내 것이 아닌 구두가 있었다.`,
        category: `horror`,
        tags: [`괴담`, `아파트`, `연재`, `반전`],
        origin: `fiction`,
        voice: `ai`,
        aiVoiceName: `m30`,
        cast: { 중개사: 'w50', 목소리: 'whisper' },
        paid: true,
        priceKRW: 300,
        seriesId: `s-402`,
        episodeNo: 2,
        publishedAt: `2026-10-17T22:00:00+09:00`,
        stats: {
            week: O(1900, 1600, 3400, 520, 390, 150, 96, 150, 1200),
            month: O(7400, 6300, 11e3, 2100, 1600, 600, 380, 560, 4900)
        },
        script: `문 앞의 그림자는 한참을 서 있다가 사라졌어요.\n저는 아침까지 불을 켜 놓고 앉아 있었어요.\n날이 밝자마자 부동산에 전화했어요. "이 집, 전에 누가 살았어요?"\n중개사는 잠깐 말이 없었어요.\n중개사: 젊은 여자분 혼자 살았어요. 이사 간 지 일 년쯤 됐고요. 어디로 갔는지는… 모르겠네요.\n\n그날 현관에 카메라를 달았어요. 움직임이 있으면 알림이 오는 거요.\n밤이 됐어요.\n또각. 또각.\n이불을 뒤집어쓰고 휴대폰만 봤어요.\n띵. 움직임 감지.\n영상을 열었어요. 복도는 비어 있었어요. 아무도 없었어요.\n그런데 소리는 계속 났어요.\n그때 알았어요. 소리는 복도에서 나는 게 아니었어요.\n집 안에서 나고 있었어요. 신발장 쪽에서.\n\n불을 켜고 신발장을 열었어요.\n제 신발들 사이에, 제 것이 아닌 구두 한 켤레.\n검은색 여자 구두. 굽이 닳아 있었어요.\n이사 올 때 분명히 없던 거예요.\n비닐에 넣어 밖에 내놨어요.\n그날 밤은 조용했어요. 처음으로 깊이 잤어요.\n\n아침에 쓰레기를 버리러 나갔어요.\n비닐봉지는 그대로 있었어요. 안이 비어 있었어요.\n집에 돌아와 신발장을 열었어요.\n거기 있었어요. 제 운동화 옆에, 가지런히.\n\n그날 저는 짐을 쌌어요. 친구 집에 가 있기로 했어요.\n현관문을 여는 순간, 복도 끝 계단에서 소리가 들렸어요.\n또각. 또각. 올라오는 소리.\n문을 닫고 잠갔어요. 문 밑 틈을 봤어요.\n불빛 한가운데가 또 까맣게 가려졌어요.\n노크. 세 번.\n그리고 아주 작은 목소리.\n목소리: 내 구두, 거기 있죠.\n다음 화에 이어집니다.`
    }, {
        id: `w-402-3`,
        cover: { kind: 'image', url: 'covers/w-402-3.jpg' },
        creatorId: `c-eunho`,
        title: `402호의 밤 3화(완결) — 문은 잠겨 있지 않았다`,
        intro: `비어 있다던 오백이 호. 거실 한가운데 구두 열한 켤레.`,
        category: `horror`,
        tags: [`괴담`, `아파트`, `연재`, `완결`],
        origin: `fiction`,
        voice: `ai`,
        aiVoiceName: `m30`,
        paid: true,
        priceKRW: 300,
        seriesId: `s-402`,
        episodeNo: 3,
        publishedAt: `2026-10-24T22:00:00+09:00`,
        stats: {
            week: O(1700, 1500, 2600, 610, 450, 190, 120, 130, 1050),
            month: O(4900, 4300, 7200, 1700, 1300, 520, 330, 380, 3100)
        },
        script: `저는 대답하지 않았어요.\n노크는 세 번 더 났고, 그 뒤로 조용해졌어요.\n아침에 경찰서에 갔어요.\n경찰은 제 이야기를 다 듣더니 이상한 표정을 지었어요. 그리고 서류 하나를 꺼냈어요.\n일 년 전, 사백이 호에 살던 여자분이 실종 신고됐었대요.\n출근길에 사라졌고, 아직 못 찾았대요.\n마지막으로 찍힌 장소는 아파트 복도 CCTV.\n검은 구두를 신고 계단을 내려가는 모습이었어요.\n\n집으로 돌아와 신발장을 열었어요.\n구두는 없었어요. 대신 바닥에 종이 한 장.\n오래된 택배 송장이었어요.\n받는 사람 이름 옆 주소가, 사백이 호가 아니었어요.\n오백이 호. 비어 있다던 윗집.\n\n경비 아저씨와 함께 오백이 호에 올라갔어요.\n문은 잠겨 있지 않았어요.\n집 안은 먼지투성이였는데, 거실 한가운데 구두가 놓여 있었어요.\n검은색, 굽이 닳은 구두.\n그 옆에 또 한 켤레. 또 한 켤레.\n전부 열한 켤레였어요.\n\n경찰이 왔고, 그 집 벽장에서 사람이 발견됐어요.\n살아 있었어요. 실종됐던 그분이었어요.\n일 년 동안 윗집 남자가 가둬 두고 있었대요.\n밤마다 걸어 다니던 소리는, 그분이 도와 달라고 바닥을 치던 소리였어요.\n구두는 그분이 창문 틈으로 하나씩 떨어뜨린 신호였고요.\n저희 집 신발장에 들어온 건, 배관 구멍을 타고 내려온 거였어요.\n\n그분은 지금 병원에 있고, 다음 달에 퇴원한대요.\n얼마 전에 제게 편지가 왔어요. 딱 한 줄.\n"소리를 들어 줘서 고마워요."\n저는 아직 사백이 호에 살아요.\n요즘은 밤이 조용해요.\n사백이 호의 밤, 여기서 끝입니다. 이 이야기는 창작입니다.`
    }, {
        id: `w-lighthouse-1`,
        cover: { kind: 'image', url: 'covers/w-lighthouse-1.jpg' },
        creatorId: `c-yeonwoo`,
        title: `등대지기의 마지막 편지 1화 — 사십 년, 이름 없는 편지`,
        intro: `봄마다 온 편지엔 한 문장만. "불빛을 보고 있어요."`,
        category: `drama`,
        tags: [`오디오드라마`, `연재`, `편지`, `자기전`],
        origin: `fiction`,
        voice: `ai`,
        aiVoiceName: `w30`,
        paid: false,
        seriesId: `s-lighthouse`,
        episodeNo: 1,
        publishedAt: `2026-10-23T20:00:00+09:00`,
        stats: {
            week: O(2600, 2100, 0, 640, 700, 180, 110, 240, 0),
            month: O(8100, 6600, 0, 2e3, 2300, 560, 350, 760, 0)
        },
        script: `남해 끝, 작은 섬에 등대가 하나 있었습니다.\n등대지기 윤 노인은 그 등대에서 사십 년을 살았습니다.\n봄이 오면 섬에 편지가 한 통씩 도착했습니다.\n보낸 사람 이름은 늘 비어 있었습니다.\n편지에는 매번 같은 문장이 적혀 있었습니다.\n"불빛을 보고 있어요."\n윤 노인은 그 편지를 사십 통 모아 두었습니다.\n\n올해, 등대는 자동화되었습니다. 사람이 필요 없게 된 것입니다.\n윤 노인은 다음 달에 섬을 떠나야 했습니다.\n마지막 밤, 그는 등대 꼭대기에 올라 바다를 봤습니다.\n멀리 수평선에서 작은 불빛 하나가 깜빡였습니다.\n세 번 짧게, 한 번 길게.\n사십 년 전, 그가 처음 등대에 왔을 때 누군가에게 가르쳐 준 신호였습니다.\n"잘 있다"는 뜻이었습니다.\n\n윤 노인은 등대의 불을 손으로 세 번 가렸다가, 한 번 길게 비췄습니다.\n수평선의 불빛이 답했습니다.\n세 번 짧게, 한 번 길게.\n그리고 처음 보는 신호가 이어졌습니다.\n두 번 길게, 두 번 짧게.\n윤 노인은 그 신호를 알았습니다.\n사십 년 전 그가 가르쳐 준 마지막 신호.\n"갈게요."\n다음 화에 이어집니다.`
    }, {
        id: `w-lighthouse-2`,
        cover: { kind: 'image', url: 'covers/w-lighthouse-2.jpg' },
        creatorId: `c-yeonwoo`,
        title: `등대지기의 마지막 편지 2화(완결) — "제가 누군지 아세요?"`,
        intro: `윤 노인은 대답 대신 편지 사십 통을 꺼냈다. 봉투마다 이름이 있었다.`,
        category: `drama`,
        tags: [`오디오드라마`, `연재`, `편지`, `완결`],
        origin: `fiction`,
        voice: `ai`,
        aiVoiceName: `w30`,
        cast: { 윤노인: 'm70', 그녀: 'w50', 소녀: 'kid', 아버지: 'm50' },
        paid: true,
        priceKRW: 300,
        seriesId: `s-lighthouse`,
        episodeNo: 2,
        publishedAt: `2026-10-30T20:00:00+09:00`,
        stats: {
            week: O(1500, 1350, 2900, 560, 610, 160, 98, 170, 1180),
            month: O(1500, 1350, 2900, 560, 610, 160, 98, 170, 1180)
        },
        script: `다음 날 아침, 섬 선착장에 작은 배 한 척이 닿았습니다.\n배에서 내린 사람은 중년의 여자였습니다.\n그녀는 등대를 올려다보다가 윤 노인을 발견했습니다.\n둘은 한참 서로를 바라봤습니다.\n\n사십 년 전, 그녀는 열 살이었습니다.\n아버지의 배가 폭풍에 휩쓸렸던 밤, 윤 노인은 등대의 불을 밤새 바다로 돌렸습니다.\n규정에 없는 일이었습니다.\n새벽에 그 불빛을 따라 배 한 척이 돌아왔고, 그 배에 소녀의 아버지가 타고 있었습니다.\n아버지는 딸에게 말했습니다.\n아버지: 저 불빛이 없었으면 못 돌아왔다.\n소녀는 그날 등대에 올라가 윤 노인에게 물었습니다.\n소녀: 불빛은 어떻게 말을 해요?\n윤 노인은 손전등으로 신호를 가르쳐 줬습니다. 잘 있다. 고맙다. 갈게요.\n\n소녀는 다음 해 육지로 이사했고, 그 뒤로 매년 봄에 편지를 보냈습니다.\n이름은 적지 않았습니다.\n윤 노인이 자신을 기억하지 못할까 봐. 기억하지 못해도, 편지는 받을 수 있게.\n그녀는 어른이 되어 배를 탔습니다. 아버지처럼 어부가 되었습니다.\n매년 봄이면 등대가 보이는 바다까지 나와 불빛을 보고 돌아갔습니다.\n올해 등대가 자동화된다는 소식을 듣고, 그녀는 처음으로 섬에 왔습니다.\n\n그녀: 제가 누군지 아세요?\n윤 노인은 대답 대신 사십 통의 편지를 꺼냈습니다.\n봉투마다 작은 글씨로 날짜가 적혀 있었고, 그 옆에 이름이 적혀 있었습니다.\n그녀의 이름이었습니다.\n윤 노인은 처음부터 알고 있었습니다.\n한 번도 답장을 못 한 건, 주소가 없어서였습니다.\n윤노인: 편지는 받는 사람이 있으면 되는 거라고 생각했소.\n\n그녀는 울었고, 윤 노인은 등대 열쇠를 그녀에게 건넸습니다.\n자동화된 등대에도 열쇠는 하나 남아 있었습니다. 꼭대기 전망실 열쇠였습니다.\n윤노인: 봄에 오면 여기서 바다를 보시오. 불빛은 기계가 켜겠지만, 보는 사람은 있어야 하니까.\n그해 봄, 섬에는 편지가 오지 않았습니다.\n대신 등대 꼭대기에 두 사람이 서서 바다를 봤습니다.\n멀리서 배 한 척이 지나가며 신호를 보냈습니다.\n세 번 짧게, 한 번 길게.\n끝. 이 이야기는 창작입니다.`
    }].map(({ script, hue, ...w }) => {
  const { sentences, speakers } = parseScript(script);
  const cue = AUDIO_CUES[w.id];
  return {
  ...w,
  sentences,
  speakers,
  // 서버에서 만든 사람 목소리 음성 파일 (site/audio/). 파일이 없으면 플레이어가 기기 음성으로 대신 읽는다.
  audio: cue ? { url: `audio/${w.id}.mp3`, duration: cue.duration, cues: cue.cues } : undefined,
  hue: hue ?? CAT[w.category].hue,
  isDemo: true,
  status: 'published',
  version: 1,
  };
});

export const SERIES = [{
        id: `s-402`,
        creatorId: `c-eunho`,
        title: `402호의 밤`,
        desc: `이사 온 아파트에서 매일 밤 들리는 구두 소리. 전 3화 완결.`,
        episodeIds: [`w-402-1`, `w-402-2`, `w-402-3`]
    }, {
        id: `s-lighthouse`,
        creatorId: `c-yeonwoo`,
        title: `등대지기의 마지막 편지`,
        desc: `사십 년 동안 봄마다 이름 없는 편지를 받은 등대지기. 전 2화 완결.`,
        episodeIds: [`w-lighthouse-1`, `w-lighthouse-2`]
    }];

export const SERIE = Object.fromEntries(SERIES.map((s) => [s.id, s]));

export const DEMO_COMMENTS = [{
        id: `cm-1`,
        workId: `w-coffee-mango`,
        authorId: `u-demo-1`,
        authorName: `출근요정`,
        text: `저희 부장님도 "알아서"파예요. 눈물 나네요.`,
        at: `2026-11-02T09:12:00+09:00`,
        isDemo: true
    }, {
        id: `cm-2`,
        workId: `w-coffee-mango`,
        authorId: `u-demo-2`,
        authorName: `라떼는말이야`,
        text: `제일 비싼 거 = 정답. 인정합니다.`,
        at: `2026-11-02T10:40:00+09:00`,
        isDemo: true
    }, {
        id: `cm-3`,
        workId: `w-bus-dahee`,
        authorId: `u-demo-3`,
        authorName: `밤산책러`,
        text: `점심까지만. 오늘은 이걸로 가 볼게요.`,
        at: `2026-11-01T08:02:00+09:00`,
        isDemo: true
    }, {
        id: `cm-4`,
        workId: `w-402-1`,
        authorId: `u-demo-4`,
        authorName: `불켜고자는사람`,
        text: `자기 전에 듣지 말라는 거 안 듣고 들었다가 불 켜고 잤습니다.`,
        at: `2026-10-11T00:30:00+09:00`,
        isDemo: true
    }, {
        id: `cm-5`,
        workId: `w-402-1`,
        authorId: `u-demo-5`,
        authorName: `복도식거주자`,
        text: `저희 집도 복도식인데요… 오늘 밤 조용하길.`,
        at: `2026-10-12T22:10:00+09:00`,
        isDemo: true
    }, {
        id: `cm-6`,
        workId: `w-402-1`,
        authorId: `u-demo-4`,
        authorName: `불켜고자는사람`,
        text: `2화 결제했습니다. 책임지세요.`,
        at: `2026-10-18T21:00:00+09:00`,
        parentId: `cm-4`,
        isDemo: true
    }, {
        id: `cm-7`,
        workId: `w-mom-dahee`,
        authorId: `u-demo-6`,
        authorName: `큰딸`,
        text: `듣고 바로 엄마한테 전화했어요. 고맙습니다.`,
        at: `2026-10-20T21:15:00+09:00`,
        isDemo: true
    }, {
        id: `cm-8`,
        workId: `w-lighthouse-1`,
        authorId: `u-demo-7`,
        authorName: `남해사람`,
        text: `세 번 짧게 한 번 길게. 오늘 밤 손전등 들고 나가 봅니다.`,
        at: `2026-10-24T01:00:00+09:00`,
        isDemo: true
    }, {
        id: `cm-9`,
        workId: `w-rice-chorok`,
        authorId: `u-demo-3`,
        authorName: `밤산책러`,
        text: `첫 게시 축하해요! 밥솥이랑 잘 지내세요.`,
        at: `2026-11-02T21:00:00+09:00`,
        isDemo: true
    }];

export const BUNDLES = [{
        id: `commute`,
        title: `출근길에 짧게`,
        desc: `#출근길 · 60초 이내`,
        filter: (e, t) => e.tags.includes(`출근길`) || t <= 60 && e.category !== `horror`
    }, {
        id: `laugh`,
        title: `오늘 웃고 싶은 사람에게`,
        desc: `코믹 카테고리`,
        filter: e => e.category === `comic`
    }, {
        id: `night`,
        title: `자기 전 조용한 이야기`,
        desc: `#자기전 · 감동·위로 · 큰 효과음 없음`,
        filter: e => e.tags.includes(`자기전`) || e.category === `warm`
    }, {
        id: `workout`,
        title: `운동 시작 전 30초`,
        desc: `#운동전 · 동기부여`,
        filter: e => e.tags.includes(`운동전`) || e.category === `motivation`
    }];
