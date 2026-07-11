import { describe, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "../../src/components/ConfirmModal";
import { fnTest } from "../fn";

beforeEach(() => {
  cleanup();
});

describe("ConfirmModal 通用确认弹窗", () => {
  fnTest(["M03.F03.I02"], "open=false 时不渲染", () => {
    render(
      <ConfirmModal
        open={false}
        title="删除确认"
        message="确定删除？"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByText("删除确认")).not.toBeInTheDocument();
    expect(screen.queryByText("确定删除？")).not.toBeInTheDocument();
  });

  fnTest(["M03.F03.I02"], "open=true 时渲染 title 与 message", () => {
    render(
      <ConfirmModal
        open
        title="删除确认"
        message="确定删除该项目？"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("删除确认")).toBeInTheDocument();
    expect(screen.getByText("确定删除该项目？")).toBeInTheDocument();
  });

  fnTest(["M03.F03.I02"], "点击确认按钮触发 onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open
        title="删除确认"
        message="确定？"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: "确认" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  fnTest(["M03.F03.I02"], "点击取消按钮触发 onCancel", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open
        title="删除确认"
        message="确定？"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  fnTest(["M03.F03.I02"], "支持自定义 confirmText / cancelText", () => {
    render(
      <ConfirmModal
        open
        title="发布确认"
        message="确定发布？"
        confirmText="发布"
        cancelText="再想想"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "发布" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再想想" })).toBeInTheDocument();
  });

  fnTest(["M03.F03.I02"], "点击遮罩层触发 onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open
        title="删除确认"
        message="确定？"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    // 遮罩层是 modal 容器（最外层 div）
    const overlay = screen.getByText("删除确认").closest(".fixed");
    await user.click(overlay!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  fnTest(["M03.F03.I02"], "确认按钮支持 loading 状态（禁用+文本变化）", () => {
    render(
      <ConfirmModal
        open
        title="删除确认"
        message="确定？"
        confirmText="删除"
        loading
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    // loading 时渲染 loadingText（默认"处理中..."），按钮禁用
    const btn = screen.getByRole("button", { name: /处理中/ });
    expect(btn).toBeDisabled();
  });
});
