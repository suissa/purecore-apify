import test from "node:test";
import assert from "node:assert/strict";
import { AdvancedFilterParser } from "../src/middlewares/filter-parser";

test("AdvancedFilterParser Suite", async (t) => {
  await t.test("Parsing simples (campo op valor)", () => {
    assert.deepEqual(AdvancedFilterParser.parse("age>18"), {
      age: { $gt: 18 },
    });
    assert.deepEqual(AdvancedFilterParser.parse("status=active"), {
      status: { $eq: "active" },
    });
    assert.deepEqual(AdvancedFilterParser.parse("name:joao"), {
      name: { $regex: "joao", $options: "i" },
    });
  });

  await t.test("Inferência de tipos", () => {
    assert.deepEqual(AdvancedFilterParser.parse("enabled=true"), {
      enabled: { $eq: true },
    });
    assert.deepEqual(AdvancedFilterParser.parse("deleted=false"), {
      deleted: { $eq: false },
    });
    assert.deepEqual(AdvancedFilterParser.parse("score=95.5"), {
      score: { $eq: 95.5 },
    });
    assert.deepEqual(AdvancedFilterParser.parse("tags=null"), {
      tags: { $eq: null },
    });
    assert.deepEqual(AdvancedFilterParser.parse('title="Hello World"'), {
      title: { $eq: "Hello World" },
    });
  });

  await t.test("Lógica AND", () => {
    const res = AdvancedFilterParser.parse("age>18&AND&status=active");
    assert.deepEqual(res, {
      $and: [{ age: { $gt: 18 } }, { status: { $eq: "active" } }],
    });
  });

  await t.test("Lógica OR", () => {
    const res = AdvancedFilterParser.parse("role=admin&OR&role=editor");
    assert.deepEqual(res, {
      $or: [{ role: { $eq: "admin" } }, { role: { $eq: "editor" } }],
    });
  });

  await t.test("Parênteses aninhados", () => {
    const res = AdvancedFilterParser.parse(
      "(age>18&AND&status=active)&OR&role=admin"
    );
    assert.deepEqual(res, {
      $or: [
        {
          $and: [{ age: { $gt: 18 } }, { status: { $eq: "active" } }],
        },
        { role: { $eq: "admin" } },
      ],
    });
  });

  await t.test("Dialética SQL-like", () => {
    const res = AdvancedFilterParser.parse('age >= 18 AND status != "pending"');
    assert.deepEqual(res, {
      $and: [{ age: { $gte: 18 } }, { status: { $ne: "pending" } }],
    });
  });

  await t.test("Proteção de strings", () => {
    const res = AdvancedFilterParser.parse(
      "name=\"John AND Doe\"&OR&status='Active OR Inactive'"
    );
    assert.deepEqual(res, {
      $or: [
        { name: { $eq: "John AND Doe" } },
        { status: { $eq: "Active OR Inactive" } },
      ],
    });
  });

  await t.test("Expressão booleana implícita", () => {
    assert.deepEqual(AdvancedFilterParser.parse("isActive"), {
      isActive: true,
    });
  });
});
