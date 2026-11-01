# BookOasis for Mangayomi

사용자가 운영하는 BookOasis 서버에 연결하는 비공식 Mangayomi JavaScript 확장입니다.

## 저장소 URL

Mangayomi의 **만화 확장 저장소**에 다음 URL을 추가하세요.

```
https://raw.githubusercontent.com/SHyoJun/bookoasis-mangayomi-extensions/main/index.json
```

확장 목록을 새로고침한 뒤 언어 `all`의 **BookOasis**를 설치합니다.
확장 설정에서 서버 주소(HTTPS, 필요하면 포트 포함), BookOasis 아이디와 비밀번호를 입력하세요.
일반/성인/둘 다 및 라이브러리 ID(all 또는 숫자)를 선택할 수 있습니다.

- `bookoasis.invalid`는 미설정 표시값이며 실제 서버가 아닙니다.
- 내부망 HTTP는 별도 허용 설정을 켜야 합니다. 공용망에서는 사용하지 마세요.
- 아이디/비밀번호는 공개 저장소에 넣지 마세요. 앱 설정/백업과 화면 공유에도 주의하세요.
- 서버 계정 권한을 우회하지 않습니다.

## 지원 범위

시리즈 목록, 이름 검색, 페이지네이션, 표지/작가/설명, ZIP/CBZ 권 목록 및 이미지 페이지 URL/인증 헤더를 구현했습니다.
**현재 EPUB/PDF/TXT는 이 확장에서 미지원**입니다. Mangayomi 자체의 소설/EPUB 지원 여부와는 별개입니다.
서버 독서 진행률 동기화, 다음 권 미리읽기 및 자동 재스캔은 하지 않습니다.

## 검증 상태

JavaScript 구문 검사와 합성 데이터를 사용하는 계약 테스트 20개를 통과했습니다.
실제 BookOasis 서버의 비인증 HTTP 401 처리도 확인했습니다.
실제 계정으로 로그인 후 이미지 열람과 Mangayomi 실기기 설치/실행은 아직 미검증입니다.
앱 버전에 따라 설치 호환성을 추가 확인해야 합니다.

## 참고

- https://github.com/kodjodevf/mangayomi
- https://github.com/kodjodevf/mangayomi-extensions
- 사용자 제공 Tachiyomi BookOasis 1.4.34 APK의 API 계약을 조사하여 독립적으로 작성했습니다.
- APK, 서버 계정, 개인 서버 주소, 도서 콘텐츠는 이 저장소에 포함하지 않습니다.
