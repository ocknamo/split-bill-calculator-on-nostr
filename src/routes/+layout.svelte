<script lang="ts">
  import './layout.css'
  import { onMount } from 'svelte'
  import { createConsoleViewer } from 'console-daijin'
  import { base } from '$app/paths'

  onMount(() => createConsoleViewer({ show: 'iframe' }))

  let { children } = $props()

  const ogImageUrl = `https://share.yabu.me/26bb2ebed6c552d670c804b0d655267b3c662b21e026d6e48ac93a6070530958/d9247b189c71491623c5418196c90ac530e7441a5dbe6eae526d9dd3446a50ba.png`
  const siteUrl = `https://ocknamo.github.io${base}/`
</script>

<svelte:head>
  <title>ワリカンさん</title>
  <meta name="description" content="グループでの支払いを簡単に精算。Nostr連携でLightning送金も可能" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={siteUrl} />
  <meta property="og:title" content="ワリカンさん" />
  <meta
    property="og:description"
    content="グループでの支払いを簡単に精算。Nostr連携でLightning送金も可能"
  />
  <meta property="og:image" content={ogImageUrl} />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{@render children()}
