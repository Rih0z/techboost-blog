import { describe, it, expect } from 'vitest';

/**
 * CTA判定ロジックのテスト
 * BlogPost.astro のタグ連動CTA判定を単体テストで検証
 */

type AffiliateCTAType = 'school' | 'server' | 'career' | 'accounting' | 'default';

// BlogPost.astro から抽出したCTA判定ロジック
function determineCTAType(tags: string[], title: string, description: string): AffiliateCTAType {
  const tLower = tags.map(t => t.toLowerCase());
  const tagStr = tLower.join(' ') + ' ' + title.toLowerCase() + ' ' + description.toLowerCase();

  const hasAccounting = tLower.some(x =>
    ['accounting', '確定申告', 'フリーランス', '会計', '税金', '経費', '青色申告', '開業届', 'freee'].includes(x)
  ) || /会計|確定申告|freee|マネーフォワード|税務|節税|経費|青色申告|インボイス/.test(tagStr);

  const hasCareer = tLower.some(x =>
    ['career', '転職', '副業', 'キャリア', 'freelance'].includes(x)
  ) || /転職|キャリア|副業|フリーランス|年収|独立/.test(tagStr);

  const hasServer = tLower.some(x =>
    ['server', 'インフラ', 'docker', 'linux', 'vps', 'devops', 'aws', 'cloud', 'kubernetes', 'nginx', 'hosting'].includes(x)
  ) || /レンタルサーバー|vps|サーバー|xserver|conoha|docker|kubernetes|aws|インフラ|デプロイ/.test(tagStr);

  const hasSchool = tLower.some(x =>
    ['school', 'プログラミングスクール', 'プログラミング学習', 'オンライン学習'].includes(x)
  ) || /プログラミングスクール|スクール比較|スクールおすすめ|オンライン学習|udemy/.test(tagStr);

  if (hasAccounting) return 'accounting';
  if (hasServer) return 'server';
  if (hasCareer) return 'career';
  if (hasSchool) return 'school';
  return 'default';
}

describe('CTA判定ロジック', () => {
  describe('Accounting CTA', () => {
    it('確定申告タグで accounting を返す', () => {
      expect(determineCTAType(['確定申告', 'フリーランス'], 'テスト', 'テスト')).toBe('accounting');
    });

    it('freee タグで accounting を返す', () => {
      expect(determineCTAType(['freee'], 'テスト', 'テスト')).toBe('accounting');
    });

    it('タイトルにマネーフォワードを含む場合 accounting を返す', () => {
      expect(determineCTAType(['tips'], 'マネーフォワード確定申告ガイド', 'テスト')).toBe('accounting');
    });

    it('descriptionに節税を含む場合 accounting を返す', () => {
      expect(determineCTAType(['guide'], 'テスト', 'フリーランスの節税テクニック')).toBe('accounting');
    });
  });

  describe('Server CTA', () => {
    it('server タグで server を返す', () => {
      expect(determineCTAType(['server', 'インフラ'], 'テスト', 'テスト')).toBe('server');
    });

    it('docker タグで server を返す', () => {
      expect(determineCTAType(['docker'], 'テスト', 'テスト')).toBe('server');
    });

    it('VPS比較のタイトルで server を返す', () => {
      expect(determineCTAType(['comparison'], 'XServerVPS vs ConoHa VPS比較', 'テスト')).toBe('server');
    });

    it('AWS タグで server を返す', () => {
      expect(determineCTAType(['aws', 'cloud'], 'テスト', 'テスト')).toBe('server');
    });
  });

  describe('Career CTA', () => {
    it('career タグで career を返す', () => {
      expect(determineCTAType(['career', '転職'], 'テスト', 'テスト')).toBe('career');
    });

    it('タイトルに年収を含む場合 career を返す', () => {
      expect(determineCTAType(['guide'], 'エンジニア年収アップ戦略', 'テスト')).toBe('career');
    });

    it('freelance タグで career を返す', () => {
      expect(determineCTAType(['freelance'], 'テスト', 'テスト')).toBe('career');
    });
  });

  describe('School CTA', () => {
    it('school タグで school を返す', () => {
      expect(determineCTAType(['school', 'プログラミングスクール'], 'テスト', 'テスト')).toBe('school');
    });

    it('タイトルにスクール比較を含む場合 school を返す', () => {
      expect(determineCTAType(['comparison'], 'プログラミングスクール比較2026', 'テスト')).toBe('school');
    });
  });

  describe('Default CTA', () => {
    it('該当タグなしで default を返す', () => {
      expect(determineCTAType(['react', 'typescript'], 'React Hooks入門', 'コンポーネント設計')).toBe('default');
    });

    it('空タグで default を返す', () => {
      expect(determineCTAType([], 'テスト', 'テスト')).toBe('default');
    });
  });

  describe('優先順位', () => {
    it('accounting は server より優先', () => {
      expect(determineCTAType(['accounting', 'server'], 'テスト', 'テスト')).toBe('accounting');
    });

    it('server は career より優先', () => {
      expect(determineCTAType(['server', 'career'], 'テスト', 'テスト')).toBe('server');
    });

    it('career は school より優先', () => {
      expect(determineCTAType(['career', 'school'], 'テスト', 'テスト')).toBe('career');
    });

    it('accounting > server > career > school の完全優先チェーン', () => {
      expect(determineCTAType(['accounting', 'server', 'career', 'school'], 'テスト', 'テスト')).toBe('accounting');
    });
  });
});
