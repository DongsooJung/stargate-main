# STARGATE 본사

portal.stargateedu.co.kr 정적 사이트 (GitHub Pages 호스팅).

## 구성
- `index.html` — 페이지 본문
- `instructor.html` — 수학·알고리즘 강사 홍보 및 플랫폼 연결 페이지
- `data/instructor-profile.json` — 강사 소개·경력·크몽·숨고·김과외 링크 관리 파일
- `data/google-sites-profile.json` — Google Sites에서 검증 후 자동 생성되는 학력·경력·수강이력
- `scripts/sync-google-sites-profile.mjs` — 공개 Google Sites 프로필 수집·검증 스크립트
- `.github/workflows/sync-google-sites-profile.yml` — 매일 06:15 KST 자동 동기화
- `스타게이트 통합 네비.css` — 공통 디자인 (3사이트 동일)
- `스타게이트 통합 네비.js` — 헤더·푸터·Cross-link 자동 주입
- `CNAME` — GitHub Pages 커스텀 도메인 (`portal.stargateedu.co.kr`)
- `.nojekyll` — Jekyll 처리 비활성화

## 수정·재배포
1. `index.html` 편집
2. `git commit -am "콘텐츠 업데이트"`
3. `git push` → 1\~2분 내 자동 반영

### 강사 홍보자료 업데이트

`data/instructor-profile.json`만 수정하면 `instructor.html`의 소개, 강의 분야, 학력·경력, Google Sites 프로필과 플랫폼 링크가 자동 갱신됩니다. 크몽·숨고·김과외 개인 프로필을 개설한 뒤 각 `url`을 프로필 주소로 교체하고 `profileVerified`를 `true`로 바꾸세요.

Google Sites의 공개 학력·경력·수강이력은 GitHub Actions가 매일 06:15 KST에 확인합니다. 내용 해시가 달라진 경우에만 `data/google-sites-profile.json`을 커밋하며, 수집·검증 실패 시 기존 데이터를 유지합니다. `Actions → Sync Google Sites instructor profile → Run workflow`에서 즉시 수동 실행할 수도 있습니다.

## 운영
주식회사 별의문 (Stargate Corporation) · ceo@stargateedu.co.kr
