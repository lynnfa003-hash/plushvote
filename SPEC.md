# PlushVote - 毛绒玩具创意投票平台

## 产品定位
一个让用户发现、分享、投票支持毛绒玩具创意的社区平台。核心理念："晒娃 + 选娃"，让创作者和爱好者互相成就。

## 核心功能（MVP）

### 1. 首页 - 创意展示墙
- 毛绒玩具卡片网格（响应式）
- 每张卡片：图片、名称、描述、分类标签、"想养它"❤️ 投票数
- 点击"想养它"按钮投票（动画效果）
- 按投票数排序

### 2. 投票机制
- 匿名用户：localStorage 存储 voter_id（UUID）
- 每用户每作品只能投一票
- 防刷：前端 localStorage + 后端 Supabase unique 约束

### 3. 内容分类
- 已量产 / 设计稿 / 同人创作

### 4. 投稿页 (/submit)
- 字段：名称、描述、图片URL、分类
- 提交后 is_approved 默认 false（待审核）

## 技术栈
- Next.js 14 (App Router) + Tailwind CSS
- Supabase (PostgreSQL + Auth)
- 部署：Vercel 免费层

## 数据库 Schema (supabase/migrations/001_init.sql)

```sql
create table plush_toys (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  image_url text not null,
  category text check (category in ('已量产', '设计稿', '同人创作')) default '设计稿',
  vote_count integer default 0,
  is_approved boolean default false,
  created_at timestamptz default now()
);

create table votes (
  id uuid default gen_random_uuid() primary key,
  toy_id uuid references plush_toys(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz default now(),
  unique(toy_id, voter_id)
);

create or replace function increment_vote_count() returns trigger as $$
begin update plush_toys set vote_count = vote_count + 1 where id = NEW.toy_id; return NEW; end;
$$ language plpgsql;
create trigger on_vote_insert after insert on votes for each row execute function increment_vote_count();

create or replace function decrement_vote_count() returns trigger as $$
begin update plush_toys set vote_count = vote_count - 1 where id = OLD.toy_id; return OLD; end;
$$ language plpgsql;
create trigger on_vote_delete after delete on votes for each row execute function decrement_vote_count();
```

## Seed 数据 (supabase/seed.sql)

```sql
insert into plush_toys (name, description, image_url, category, vote_count, is_approved) values
('云朵熊', '软绵绵的白色小熊，肚子上有彩虹图案，抱起来像抱着一朵云', 'https://picsum.photos/seed/bear1/400/400', '已量产', 42, true),
('星空兔', '深蓝色兔子，耳朵上绣着星星，夜光材质，关灯会发光', 'https://picsum.photos/seed/rabbit1/400/400', '设计稿', 88, true),
('抹茶猫', '绿色渐变的慵懒猫咪，眼睛是琥珀色', 'https://picsum.photos/seed/cat1/400/400', '同人创作', 65, true),
('泡泡龙', '圆滚滚的粉色小龙，翅膀是透明欧根纱，超级软糯', 'https://picsum.photos/seed/dragon1/400/400', '设计稿', 120, true),
('蘑菇精', '红白波点蘑菇造型，帽子可以摘下来，里面藏着小精灵', 'https://picsum.photos/seed/mushroom1/400/400', '同人创作', 37, true),
('奶油狗', '米白色柴犬，表情呆萌，肚子特别大特别软，适合当枕头', 'https://picsum.photos/seed/dog1/400/400', '已量产', 95, true);
```

## 设计规范
- 配色：粉色(#FFB7C5) / 薰衣草紫(#C8B5E8) / 薄荷绿(#B5E8D0) / 奶白(#FFF9F0)
- 风格：圆角卡片、柔和阴影、hover 微动效
- 全中文 UI

## 环境变量 (.env.local.example)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
