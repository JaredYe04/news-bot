import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { neutralizeGithubMentions, generateMarkdown } from "./generate-md.js";

const LIVE_MENTION =
  /(^|[^A-Za-z0-9._%+-])@([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?(?:\/[A-Za-z0-9](?:[A-Za-z0-9._-]{0,37}[A-Za-z0-9])?)?)/;

function assertNoLiveMentions(text) {
  assert.equal(LIVE_MENTION.test(text), false, `unexpected live mention in: ${text}`);
}

describe("neutralizeGithubMentions", () => {
  it("neutralizes a bare @username", () => {
    const result = neutralizeGithubMentions("hello @rami3l there");
    assert.equal(result.includes("@\u200Brami3l"), true);
    assert.equal(result.includes("`@\u200Brami3l`"), true);
    assertNoLiveMentions(result);
  });

  it("neutralizes a parenthesized @username", () => {
    const result = neutralizeGithubMentions("Chris Denton (@ChrisDenton)");
    assert.equal(result.includes("`@\u200BChrisDenton`"), true);
    assertNoLiveMentions(result);
  });

  it("neutralizes @org/team mentions", () => {
    const result = neutralizeGithubMentions("see @rust-lang/libs");
    assert.equal(result.includes("`@\u200Brust-lang/libs`"), true);
    assertNoLiveMentions(result);
  });

  it("leaves email addresses unchanged", () => {
    const email = "contact user@example.com for details";
    assert.equal(neutralizeGithubMentions(email), email);
  });

  it("neutralizes several handles in one Rust-blog excerpt", () => {
    const excerpt =
      "Gen Li (@rami3l), Chris Denton (@ChrisDenton), Alejandra González (@blyxyas), León Liehr (@fmease), Jason Newcomb (@Jarcho) and Jonas Böttiger (@joboet).";
    const result = neutralizeGithubMentions(excerpt);
    for (const name of ["rami3l", "ChrisDenton", "blyxyas", "fmease", "Jarcho", "joboet"]) {
      assert.equal(result.includes(`\`@\u200B${name}\``), true, `missing neutralized @${name}`);
    }
    assertNoLiveMentions(result);
  });
});

describe("generateMarkdown", () => {
  it("does not emit live @username mentions from article content or summary", () => {
    const md = generateMarkdown(
      "2026-08-30",
      [
        {
          category: "计算机科学 / 软件工程",
          items: [
            {
              title: "Announcing our first Maintainers in Residence",
              source: "Rust Blog",
              sourceType: "blog",
              contentType: "fulltext",
              fullContent:
                "We are very happy to announce the Rust Project's first round of Maintainers in Residence: Gen Li (@rami3l), Chris Denton (@ChrisDenton).",
              link: "https://blog.rust-lang.org/example"
            }
          ]
        }
      ],
      "今日 Rust 宣布维护者驻留计划，成员包括 @rami3l 与 @org/team。",
      null,
      "上午"
    );

    assertNoLiveMentions(md);
    assert.equal(md.includes("`@\u200Brami3l`"), true);
    assert.equal(md.includes("`@\u200BChrisDenton`"), true);
    assert.equal(md.includes("`@\u200Borg/team`"), true);
  });

  it("does not rewrite email addresses in generated markdown", () => {
    const md = generateMarkdown("2026-08-30", [
      {
        category: "工程 / 系统 / 工具",
        items: [
          {
            title: "Contact",
            source: "Example",
            sourceType: "news",
            snippet: "Please email user@example.com",
            link: "https://example.com"
          }
        ]
      }
    ]);

    assert.equal(md.includes("user@example.com"), true);
    assertNoLiveMentions(md);
  });
});
