<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    open,
    labelledby,
    variant = '',
    onclose,
    children,
  }: {
    open: boolean;
    labelledby: string;
    variant?: string;
    onclose: () => void;
    children: Snippet;
  } = $props();

  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  class="modal {variant}"
  bind:this={dialog}
  aria-labelledby={labelledby}
  onclose={onclose}
  onclick={(event) => {
    if (event.target === dialog) dialog?.close();
  }}
>
  <button class="icon-button modal__close" type="button" aria-label="Закрыть" onclick={() => dialog?.close()}>
    ×
  </button>
  {@render children()}
</dialog>

<style>
  .modal {
    width: min(610px, calc(100vw - 28px));
    max-height: calc(100vh - 32px);
    padding: 38px;
    border: 1px solid #35536a;
    border-top: 3px solid var(--cyan);
    border-radius: 20px;
    color: #eaf8ff;
    background: #081127;
    box-shadow: 0 28px 70px rgba(0, 0, 0, 0.52);
  }

  .modal::backdrop {
    background: rgba(1, 4, 15, 0.78);
  }

  .icon-button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid #35536a;
    border-radius: 50%;
    color: #8eabbc;
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    font-size: 20px;
  }

  .icon-button:hover {
    color: white;
    background: rgba(57, 231, 255, 0.1);
  }

  .modal__close {
    position: absolute;
    z-index: 2;
    top: 18px;
    right: 18px;
  }

  :global(.modal__lead) {
    max-width: 480px;
    margin: 0 0 26px;
    color: #839bb0;
    font-size: 13px;
    line-height: 1.65;
  }

  :global(.modal h2) {
    margin: 0;
    color: #fff;
    font-family: 'IBM Plex Sans', Arial, sans-serif;
    font-size: clamp(25px, 3vw, 38px);
    font-weight: 500;
    line-height: 1.08;
    letter-spacing: -0.025em;
  }

  @media (max-width: 760px) {
    .modal {
      padding: 34px 18px;
      border-radius: 16px;
    }
  }
</style>
