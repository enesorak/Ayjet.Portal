<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/apiClient';
import { useToast } from 'vue-toastification';

const users = ref<any[]>([]);
const roles = ref<any[]>([]); // Sistemdeki tüm rolleri tutacak
const loading = ref(true);
const toast = useToast();

const showCreateModal = ref(false);
const showEditRolesModal = ref(false);

const newUser = ref({ email: '', password: '', firstName: '', lastName: '', roles: [] as string[] });
const editingUser = ref<any>(null); // Rolleri düzenlenecek kullanıcı
const selectedRoles = ref<string[]>([]); // Rol düzenleme modal'ındaki seçimler

const fetchUsers = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get('/accounts');
    users.value = response.data;
  } catch (error) { toast.error("Kullanıcılar getirilirken hata oluştu."); }
  finally { loading.value = false; }
};

const fetchRoles = async () => {
  try {
    const response = await apiClient.get('/roles');
    roles.value = response.data;
  } catch (error) { toast.error("Roller getirilirken hata oluştu."); }
};

const handleCreateUser = async () => {
  try {
    await apiClient.post('/accounts/register', newUser.value);
    toast.success("Kullanıcı başarıyla oluşturuldu.");
    showCreateModal.value = false;
    await fetchUsers();
  } catch (error: any) { toast.error(error.response?.data?.Message || "Kullanıcı oluşturulurken bir hata oluştu."); }
};

const openEditRolesModal = (user: any) => {
  editingUser.value = user;
  selectedRoles.value = [...user.roles]; // Mevcut rolleriyle başlat
  showEditRolesModal.value = true;
};

const handleUpdateRoles = async () => {
  if (!editingUser.value) return;
  try {
    await apiClient.post(`/accounts/${editingUser.value.id}/roles`, selectedRoles.value);
    toast.success("Kullanıcı rolleri güncellendi.");
    showEditRolesModal.value = false;
    await fetchUsers();
  } catch (error) { toast.error("Roller güncellenirken bir hata oluştu."); }
};

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchRoles()]);
});
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Kullanıcı Yönetimi</h1>
      <button @click="showCreateModal = true; newUser = { email: '', password: '', firstName: '', lastName: '', roles: [] };" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700">
        Yeni Kullanıcı Ekle
      </button>
    </div>

    <div class="bg-white shadow rounded-lg overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Soyad</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-posta</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roller</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eylemler</th>
        </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="loading"><td colspan="4" class="text-center py-4">Yükleniyor...</td></tr>
        <tr v-else v-for="user in users" :key="user.id">
          <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{{ user.fullName }}</td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-500">{{ user.email }}</td>
          <td class="px-6 py-4">
            <div class="flex flex-wrap gap-2">
                <span v-for="role in user.roles" :key="role" class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {{ role }}
                </span>
            </div>
          </td>
          <td class="px-6 py-4 text-right">
            <button @click="openEditRolesModal(user)" class="text-indigo-600 hover:text-indigo-900">Rolleri Yönet</button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showCreateModal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
        <h2 class="text-xl font-bold mb-6">Yeni Kullanıcı Oluştur</h2>
        <form @submit.prevent="handleCreateUser" class="space-y-4">
          <input v-model="newUser.firstName" placeholder="İsim" required class="w-full px-3 py-2 border rounded" />
          <input v-model="newUser.lastName" placeholder="Soyisim" required class="w-full px-3 py-2 border rounded" />
          <input v-model="newUser.email" placeholder="E-posta" type="email" required class="w-full px-3 py-2 border rounded" />
          <input v-model="newUser.password" placeholder="Şifre" type="password" required class="w-full px-3 py-2 border rounded" />
          <div>
            <label class="block font-medium mb-2">Roller:</label>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="role in roles" :key="role.id" class="flex items-center">
                <input type="checkbox" :id="`role-${role.id}`" :value="role.name" v-model="newUser.roles" class="h-4 w-4 rounded border-gray-300">
                <label :for="`role-${role.id}`" class="ml-2 text-sm">{{ role.name }}</label>
              </div>
            </div>
          </div>
          <div class="flex justify-end space-x-4 pt-4">
            <button type="button" @click="showCreateModal = false" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded">Oluştur</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showEditRolesModal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
        <h2 class="text-xl font-bold mb-2">Rolleri Düzenle</h2>
        <p class="text-sm text-gray-600 mb-6">{{ editingUser.fullName }}</p>
        <form @submit.prevent="handleUpdateRoles" class="space-y-4">
          <div>
            <label class="block font-medium mb-2">Atanacak Roller:</label>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="role in roles" :key="role.id" class="flex items-center">
                <input type="checkbox" :id="`edit-role-${role.id}`" :value="role.name" v-model="selectedRoles" class="h-4 w-4 rounded border-gray-300">
                <label :for="`edit-role-${role.id}`" class="ml-2 text-sm">{{ role.name }}</label>
              </div>
            </div>
          </div>
          <div class="flex justify-end space-x-4 pt-4">
            <button type="button" @click="showEditRolesModal = false" class="bg-gray-300 px-4 py-2 rounded">İptal</button>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded">Güncelle</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>