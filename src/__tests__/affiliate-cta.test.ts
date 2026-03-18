import { describe, expect, it } from 'vitest';

// BlogPost.astro のアフィリエイトCTA判定ロジックを抽出してテスト
type AffiliateCTAType = 'school' | 'server' | 'career' | 'accounting' | 'default';

function determineAffiliateCTAType(
  tags: string[],
  title: string,
  description: string,
): AffiliateCTAType {
  const tagList = tags ?? [];
  const tagStr = tagList.join(' ').toLowerCase() + ' ' + title.toLowerCase() + ' ' + description.toLowerCase();
  const tLower = tagList.map(t => t.toLowerCase());

  const hasAccounting = tLower.some(x =>
    ['accounting', '確定申告', 'フリーランス', '会計', '税金', '経費', '青色申告', '開業届', 'freee'].includes(x),
  ) || /会計|確定申告|freee|マネーフォワード|税務|節税|経費|青色申告|インボイス/.test(tagStr);

  const hasCareer = tLower.some(x =>
    ['career', '転職', '副業', 'キャリア', 'freelance'].includes(x),
  ) || /転職|キャリア|副業|フリーランス|年収|独立/.test(tagStr);

  const hasServer = tLower.some(x =>
    ['server', 'インフラ', 'docker', 'linux', 'vps', 'devops', 'aws', 'cloud', 'kubernetes', 'nginx', 'hosting'].includes(x),
  ) || /レンタルサーバー|vps|サーバー|xserver|conoha|docker|kubernetes|aws|インフラ|デプロイ/.test(tagStr);

  const hasSchool = tLower.some(x =>
    ['school', 'プログラミングスクール', 'プログラミング学習', 'オンライン学習'].includes(x),
  ) || /プログラミングスクール|スクール比較|スクールおすすめ|オンライン学習|udemy/.test(tagStr);

  if (hasAccounting) return 'accounting';
  if (hasServer) return 'server';
  if (hasCareer) return 'career';
  if (hasSchool) return 'school';
  return 'default';
}

describe('アフィリエイトCTA判定ロジック', () => {
  describe('accounting カテゴリ', () => {
    it('タグに「確定申告」があればaccounting', () => {
      expect(determineAffiliateCTAType(['確定申告', 'フリーランス'], '', '')).toBe('accounting');
    });

    it('タグに「freee」があればaccounting', () => {
      expect(determineAffiliateCTAType(['freee'], '', '')).toBe('accounting');
    });

    it('タイトルに「会計」があればaccounting', () => {
      expect(determineAffiliateCTAType(['React'], 'クラウド会計ソフト比較', '')).toBe('accounting');
    });

    it('descriptionに「マネーフォワード」があればaccounting', () => {
      expect(determineAffiliateCTAType([], '', 'マネーフォワードの使い方')).toBe('accounting');
    });

    it('タグに「インボイス」関連があればaccounting（description経由）', () => {
      expect(determineAffiliateCTAType([], '', 'インボイス制度対応ガイド')).toBe('accounting');
    });
  });

  describe('server カテゴリ', () => {
    it('タグに「docker」があればserver', () => {
      expect(determineAffiliateCTAType(['docker'], '', '')).toBe('server');
    });

    it('タグに「AWS」があればserver（大文字小文字無視）', () => {
      expect(determineAffiliateCTAType(['AWS'], '', '')).toBe('server');
    });

    it('タイトルに「レンタルサーバー」があればserver', () => {
      expect(determineAffiliateCTAType(['web'], 'レンタルサーバー比較', '')).toBe('server');
    });
  });

  describe('career カテゴリ', () => {
    it('タグに「転職」があればcareer', () => {
      expect(determineAffiliateCTAType(['転職'], '', '')).toBe('career');
    });

    it('タグに「career」があればcareer', () => {
      expect(determineAffiliateCTAType(['career'], '', '')).toBe('career');
    });

    it('タイトルに「年収」があればcareer', () => {
      expect(determineAffiliateCTAType(['engineer'], 'エンジニア年収ランキング', '')).toBe('career');
    });
  });

  describe('school カテゴリ', () => {
    it('タグに「school」があればschool', () => {
      expect(determineAffiliateCTAType(['school'], '', '')).toBe('school');
    });

    it('タイトルに「プログラミングスクール」があればschool', () => {
      expect(determineAffiliateCTAType([], 'プログラミングスクール比較', '')).toBe('school');
    });
  });

  describe('優先順位', () => {
    it('accounting > server（会計タグとdockerタグ両方ある場合）', () => {
      expect(determineAffiliateCTAType(['確定申告', 'docker'], '', '')).toBe('accounting');
    });

    it('server > career', () => {
      expect(determineAffiliateCTAType(['docker', 'career'], '', '')).toBe('server');
    });

    it('career > school', () => {
      expect(determineAffiliateCTAType(['career', 'school'], '', '')).toBe('career');
    });

    it('タグなし・マッチなしはdefault', () => {
      expect(determineAffiliateCTAType([], 'Reactの基礎', 'React入門')).toBe('default');
    });

    it('空配列でdefault', () => {
      expect(determineAffiliateCTAType([], '', '')).toBe('default');
    });
  });

  describe('エッジケース', () => {
    it('大文字小文字混在タグでも判定できる', () => {
      expect(determineAffiliateCTAType(['Docker'], '', '')).toBe('server');
      expect(determineAffiliateCTAType(['CAREER'], '', '')).toBe('career');
      expect(determineAffiliateCTAType(['Accounting'], '', '')).toBe('accounting');
    });

    it('日本語タグの完全一致', () => {
      expect(determineAffiliateCTAType(['プログラミングスクール'], '', '')).toBe('school');
      expect(determineAffiliateCTAType(['プログラミング学習'], '', '')).toBe('school');
    });
  });
});
