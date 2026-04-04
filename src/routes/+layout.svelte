<script lang="ts">
  import './layout.css'
  import { onMount } from 'svelte'
  import { createConsoleViewer } from 'console-daijin'

  onMount(() => createConsoleViewer({ show: 'iframe' }))

  let { children } = $props()
</script>

<svelte:head>
  <title>ワリカンさん</title>
  <meta name="description" content="グループでの支払いを簡単に精算。Nostr連携でLightning送金も可能" />
  <meta property="og:title" content="ワリカンさん" />
  <meta
    property="og:description"
    content="グループでの支払いを簡単に精算。Nostr連携でLightning送金も可能"
  />
  <meta
    property="og:image"
    content="https://image.nostr.build/030a16e61f69ac5035f7c013c0146393ae6ab425c7248c04e3f1c772d7f227f8.webp"
  />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{@render children()}
