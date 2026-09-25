<script lang="ts" setup>
const { principal } = useCurrentUser()
const { logout } = useAuth()
</script>

<template>
  <div>
    hello {{ principal }}
  </div>
  <UButton @click="logout()">Logout</UButton>

</template>

<style scoped></style>