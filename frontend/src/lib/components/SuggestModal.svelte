<script lang="ts">
  import Modal from './Modal.svelte';
  import { suggestOpen, selectedRegionId, regionNames } from '$lib/stores';
  import { submitEvent } from '$lib/api';

  let title = $state('');
  let regionCode = $state('');
  let city = $state('');
  let startsAt = $state('');
  let endsAt = $state('');
  let website = $state('');
  let details = $state('');
  let contactName = $state('');
  let contactEmail = $state('');

  let submitting = $state(false);
  let status = $state('');
  let statusVariant = $state<'success' | 'error' | ''>('');

  let regionOptions = $derived(
    [...$regionNames].sort((a, b) => a[1].localeCompare(b[1], 'ru')),
  );

  $effect(() => {
    if ($suggestOpen) regionCode = $selectedRegionId ?? '';
  });

  function resetForm() {
    title = '';
    regionCode = '';
    city = '';
    startsAt = '';
    endsAt = '';
    website = '';
    details = '';
    contactName = '';
    contactEmail = '';
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    status = 'Отправляем…';
    statusVariant = '';
    submitting = true;
    try {
      const message = await submitEvent({
        title,
        regionCode,
        city,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        website,
        details,
        contactName,
        contactEmail,
      });
      status = message;
      statusVariant = 'success';
      resetForm();
      setTimeout(() => suggestOpen.set(false), 1500);
    } catch (error) {
      status = error instanceof Error ? error.message : 'Не удалось отправить форму';
      statusVariant = 'error';
    } finally {
      submitting = false;
    }
  }
</script>

<Modal
  open={$suggestOpen}
  labelledby="suggest-title"
  variant="modal--form"
  onclose={() => suggestOpen.set(false)}
>
  <p class="eyebrow">ПОМОГИТЕ КАРТЕ СТАТЬ ПОЛНЕЕ</p>
  <h2 id="suggest-title">Предложить CTF</h2>
  <p class="modal__lead">Пришлите основные данные. Администратор проверит их перед публикацией.</p>
  <form class="suggest-form" onsubmit={handleSubmit}>
    <label><span>Название *</span>
      <input bind:value={title} maxlength="160" required placeholder="Например, ByteTheFlag 2026" />
    </label>
    <label><span>Регион *</span>
      <select bind:value={regionCode} required>
        <option value="">Выберите регион</option>
        {#each regionOptions as [id, name] (id)}
          <option value={id}>{name}</option>
        {/each}
      </select>
    </label>
    <label><span>Город</span><input bind:value={city} maxlength="120" placeholder="Москва" /></label>
    <div class="form-row">
      <label><span>Начало *</span><input type="datetime-local" bind:value={startsAt} required /></label>
      <label><span>Окончание</span><input type="datetime-local" bind:value={endsAt} /></label>
    </div>
    <label><span>Ссылка</span><input type="url" bind:value={website} placeholder="https://…" /></label>
    <label><span>Что важно знать *</span>
      <textarea bind:value={details} rows="4" required placeholder="Формат, участники, регистрация…"></textarea>
    </label>
    <div class="form-row">
      <label><span>Ваше имя *</span><input bind:value={contactName} maxlength="120" required /></label>
      <label><span>Email *</span><input type="email" bind:value={contactEmail} required /></label>
    </div>
    <p class="form-status" class:is-success={statusVariant === 'success'} class:is-error={statusVariant === 'error'} role="status">
      {status}
    </p>
    <button class="button button--primary button--wide" type="submit" disabled={submitting}>
      Отправить на проверку <span>→</span>
    </button>
  </form>
</Modal>

<style>
  .suggest-form {
    display: grid;
    gap: 16px;
    margin-top: 26px;
  }

  .suggest-form label {
    display: grid;
    gap: 7px;
  }

  .suggest-form label > span {
    color: #89a2b6;
    font: 600 9px 'IBM Plex Mono';
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .suggest-form input,
  .suggest-form select,
  .suggest-form textarea {
    width: 100%;
    border: 1px solid #304b60;
    border-radius: 7px;
    outline: none;
    padding: 12px 13px;
    color: #e4edf5;
    background: #071025;
  }

  .suggest-form input:focus,
  .suggest-form select:focus,
  .suggest-form textarea:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(57, 231, 255, 0.08);
  }

  .suggest-form textarea {
    resize: vertical;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-status {
    min-height: 16px;
    margin: 0;
    font-size: 12px;
  }

  .form-status.is-success {
    color: #5cf0a8;
  }

  .form-status.is-error {
    color: #ff8f9b;
  }

  @media (max-width: 760px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
