/**
 * SYNOPSIS: WRM consult spam weeder — live pitches from the 2026-08-13 backlog.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import test from "node:test";
import assert from "node:assert/strict";
import { isWrmConsultSpam } from "../routes/wrm-consult-routes.js";

test("MAVIS / Virtual Hand pitches are spam", () => {
  const isha = isWrmConsultSpam({
    email: "isha@virtualhandsupport.com",
    message: "I'm Isha with Virtual Hand Support. You get a MAVIS Specialist. Reply YES for a quick Zoom or STOP to opt out.",
  });
  assert.equal(isha.spam, true);

  const ashley = isWrmConsultSpam({
    email: "ashleybro@parallelaid.com",
    message: "I'm Ashley with WorkMatrixx. You get a MAVIS Specialist. Reply YES for a quick Zoom, or STOP to opt out.",
  });
  assert.equal(ashley.spam, true);

  const meredith = isWrmConsultSpam({
    email: "meredith@virtualhelpdesk.pro",
    message: "I'm Meredith with Virtual Helpdesk Pro. Reply YES for a quick Zoom, or STOP to opt out.",
  });
  assert.equal(meredith.spam, true);

  const arden = isWrmConsultSpam({
    email: "arden@virtualhandsupport.com",
    message: "I'm Arden from Virtual Hand Support. Reply YES for a quick Zoom, or STOP to opt out.",
  });
  assert.equal(arden.spam, true);
});

test("Russian quote templates from bk.ru / yandex.ru are spam", () => {
  const iriza = isWrmConsultSpam({
    email: "dautaevai546@bk.ru",
    message: "Добрый день! Нужен расчёт: консультация специалиста. Рассматриваю на ближайшее время.",
  });
  assert.equal(iriza.spam, true);
});

test("real maternity consults are not spam", () => {
  assert.equal(
    isWrmConsultSpam({
      email: "tynija03@gmail.com",
      message: "How do I deal with Postpartum",
    }).spam,
    false
  );
  assert.equal(
    isWrmConsultSpam({
      email: "mamaspoonz@gmail.com",
      message: "Do you offer doula certification courses? Thank you",
    }).spam,
    false
  );
  assert.equal(
    isWrmConsultSpam({
      email: "cloudkatey702@gmail.com",
      message: "due date sep 2",
    }).spam,
    false
  );
  assert.equal(
    isWrmConsultSpam({
      email: "kavinta2024@gmail.com",
      message: "10/24/26; just looking for a midwife! planning on doing a hospital birth",
    }).spam,
    false
  );
  assert.equal(
    isWrmConsultSpam({
      email: "miranda.smith93@gmail.com",
      message: "I just tested positive at home and estimate to be about five weeks along.",
    }).spam,
    false
  );
});
