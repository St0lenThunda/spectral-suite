import { ref } from 'vue';

export const isInfoModalOpen = ref( false );
export const activeToolId = ref<string | null>( null );

export function useToolInfo () {
  const openInfo = ( toolId: string ) => {
    activeToolId.value = toolId;
    isInfoModalOpen.value = true;
  };

  const closeInfo = () => {
    isInfoModalOpen.value = false;
  };

  return {
    isInfoModalOpen,
    activeToolId,
    openInfo,
    closeInfo
  };
}
